// 1. State & references

// Creating post-it notes
const canvas = document.getElementById('canvas')
const addNoteBtn = document.getElementById('addNote')
let noteCount = 0
let dragging = false

const NOTE_COLORS = ['#fff59d', '#ffcc80', '#a5d6a7', '#90caf9', '#f8bbd0']

// 2. Position & drag utilities

// Make bounds so post-its cant escape the canvas
function clampToCanvas(element) {
    const maxLeft = Math.max(0, canvas.clientWidth - element.offsetWidth)
    const maxTop = Math.max(0, canvas.clientHeight - element.offsetHeight)
    const left = parseInt(element.style.left) || 0
    const top = parseInt(element.style.top) || 0
    element.style.left = Math.min(Math.max(0, left), maxLeft) + 'px'
    element.style.top = Math.min(Math.max(0, top), maxTop) + 'px'
}

// Ability to drag post it notes and place them in any part of the screen
function makeDraggable(element, handle, onDrop) {
    let offsetX = 0
    let offsetY = 0

    // Select note to drag it around
    handle.addEventListener('pointerdown', (event) => {
        if (event.target.closest('button, input')) return // buttons & inputs are not draggable


        const rect = element.getBoundingClientRect()
        offsetX = event.clientX - rect.left
        offsetY = event.clientY - rect.top

        dragging = true
        element.style.transform = 'none'
        handle.setPointerCapture(event.pointerId)
    })

    // Move the note itself
    handle.addEventListener('pointermove', (event) => {
        if (!dragging) return
        element.style.left = (event.clientX - offsetX) + 'px'
        element.style.top = (event.clientY - offsetY) + 'px'
        clampToCanvas(element)
    })

    // stop dragging state
    handle.addEventListener('pointerup', () => {
        dragging = false
        if (onDrop) onDrop()
    })
}

// Function to resize postits from its bottom-right grip
function makeResizable(element, grip, onDone) {
    let startX = 0, startY = 0, startW = 0, startH = 0

    grip.addEventListener('pointerdown', (event) => {
        startX = event.clientX
        startY = event.clientY
        startW = element.offsetWidth
        startH = element.offsetHeight
        dragging = true
        grip.setPointerCapture(event.pointerId)
    })

    grip.addEventListener('pointermove', (event) => {
        if (!dragging) return
        const maxW = canvas.clientWidth - parseInt(element.style.left)
        const maxH = canvas.clientHeight -parseInt(element.style.top)
        const w = startW + (event.clientX - startX)
        const h = startH + (event.clientY - startY)
        element.style.width = Math.min(Math.max(140, w), maxW) + 'px'
        element.style.height = Math.min(Math.max(100, h), maxH) + 'px'
    })

    grip.addEventListener('pointerup', () => {
        dragging = false
        if (onDone) onDone()
    })
}

function makeWindowHandle(handle, onDrag) {
    let lastX = 0
    let lastY = 0

    handle.addEventListener('pointerdown', (event) => {
        lastX = event.screenX
        lastY = event.screenY
        dragging = true
        handle.setPointerCapture(event.pointerId)
    })

    handle.addEventListener('pointermove', (event) => {
        if (!dragging) return
        const dx = event.screenX - lastX
        const dy = event.screenY - lastY
        lastX = event.screenX
        lastY = event.screenY
        onDrag(dx, dy)
    })

    handle.addEventListener('pointerup', () => {
        dragging = false
        window.api.saveCanvas()
    })
}

// 3. Mouse: capture / pass-through

// Mouse handler function
let captured = false

document.addEventListener('mousemove', (event) => {
    if (dragging) return // Handle mouse pointer escaping while dragging

    const hoverInteractive = event.target.closest('.interactive') !== null

    if (hoverInteractive && !captured) {
        captured = true
        window.api.captureMouse()
    } else if (!hoverInteractive && captured) {
        captured = false
        window.api.breachMouse()
    }
})

// 4. Notes: save, create, add, load

// Save function in localStorage
function saveNotes() {
    const notes = [...canvas.querySelectorAll('.note')].map(note => ({
        x: parseInt(note.style.left),
        y: parseInt(note.style.top),
        color: note.dataset.color,
        title: note.querySelector('.noteTitle').value,
        width: note.offsetWidth,
        height: note.classList.contains('collapsed') ? parseInt(note.dataset.fullHeight) : note.offsetHeight,
        collapsed: note.classList.contains('collapsed'),
        blocks: getBlocks(note)
    }))
    window.api.saveNotes(notes)
}

// Aux function to set note color
function setNoteColor(note, color) {
    note.dataset.color = color
    note.style.background = color
}

// NEW BLOCK IMPLEMENTATION
// Replaces items and lists, now notes are made up by blocks with different types 
// starting off by just Text / Check

// Read the block of a note from its rows
function getBlocks(note) {
    return [...note.querySelectorAll('.block')].map(row => {
        const block = { type: row.dataset.type, text: row.querySelector('.blockText').value }
        if (block.type === 'item') block.done = row.querySelector('.blockCheck').checked
        return block
    })
}

// Convert old notes into blocks
function migrateBlocks({ text = '', items = []}) {
    const blocks = text.split('\n').filter(line => line.trim() !== '').map(line => ({ type: 'text', text: line }))
    items.forEach(item => blocks.push({ type: 'item', text: item.text, done: item.done }))
    return blocks
}

// Switch a block between text and checkbox item
function setBlockType(row, type) {
    row.dataset.type = type
    if (type === 'text') {
        row.querySelector('.blockCheck').checked = false
        row.classList.remove('done')
    }
}

// Focus a block's text and put the caret at the start or the end
function focusBlock(row, atEnd = true) {
    const input = row.querySelector('.blockText')
    input.focus()
    const pos = atEnd ? input.value.length : 0
    input.setSelectionRange(pos, pos)
}

// Add one block row (text or checkbox) to a note
function addBlock(note, { type ='text', text = '', done = false}, after = null) {
    const row = document.createElement('div')
    row.className = 'block'
    row.dataset.type = type
    row.classList.toggle('done', type === 'item' && done)
    row.innerHTML = `
        <input type="checkbox" class="blockCheck">
        <textarea class="blockText" rows="1" spellcheck="false" placeholder="Escribe aquí..."></textarea>
    `

    const check = row.querySelector('.blockCheck')
    const input = row.querySelector('.blockText')
    check.checked = done
    input.value = text

    check.addEventListener('change', () => {
        row.classList.toggle('done', check.checked)
        saveNotes()
    })

    input.addEventListener('input', () => {
        autoGrow(input)
        saveNotes()
    })

    input.addEventListener('keydown', (event) => {
        const prev = row.previousElementSibling
        const next = row.nextElementSibling
        const lineH = parseFloat(getComputedStyle(input).lineHeight)
        const singleLine = input.offsetHeight < lineH * 1.5

        // Enter on an empty item: turn it into text (this is how you leave a list)
        if (event.key === 'Enter' && !event.shiftKey && row.dataset.type === 'item' && input.value === '') {
            event.preventDefault()
            setBlockType(row, 'text')
            saveNotes()
            return
        }

        // Enter: new block of the same type below (Shift+Enter keeps the default: a line break)
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            const newRow = addBlock(note, { type: row.dataset.type }, row)
            focusBlock(newRow)
            saveNotes()
            return
        }

        // Backspace on an empty block: remove it (never the last one)
        if (event.key === 'Backspace' && input.value === '' && prev) {
            event.preventDefault()
            row.remove()
            focusBlock(prev)
            saveNotes()
            return
        }

        // Arrow up / down between blocks
        if (event.key === 'ArrowUp' && prev && (singleLine || input.selectionStart === 0)) {
            event.preventDefault()
            focusBlock(prev)
        }
        if (event.key === 'ArrowDown' && next && (singleLine || input.selectionStart === input.value.length)) {
            event.preventDefault()
            focusBlock(next, false)
        }
    })

    if (after) {
        after.insertAdjacentElement('afterend', row)
    } else {
        note.querySelector('.noteBody').appendChild(row)
    }

    autoGrow(input)
    return row
}

// Make textarea as tall as its content
function autoGrow(textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
}

// Collapse or expand a note to its header height, optionally animated
function setCollapsed(note, collapsed, animate = false) {
    const headerH = note.querySelector('.noteHeader').offsetHeight
    note.classList.toggle('animating', animate)
    note.classList.toggle('collapsed', collapsed)
    note.style.height = (collapsed ? headerH : note.dataset.fullHeight) + 'px'
    note.scrollTop = 0
}

// Function to create a note
function createNote({ x, y, color = NOTE_COLORS[0], title = '', width = 220, height = 200, blocks, text, items, collapsed = false }) {
    height = Math.max(height, 100)
    width = Math.max(width, 140)
    const note = document.createElement('div')
    note.className = 'note interactive'
    note.style.left = x + 'px'
    note.style.top = y + 'px'
    note.style.width = width + 'px'
    note.style.height = height + 'px'
    note.dataset.fullHeight = height
    setNoteColor(note, color)

    note.innerHTML = `
        <div class="noteHeader">
            <button class="collapseNote" title="Colapsar / expandir"><svg><use href="#icon-chevron"/></svg></button>
            <input class="noteTitle" placeholder="Título" spellcheck="false">
            <button class="listNote" title="Agregar casilla"><svg><use href="#icon-check"/></svg></button>
            <button class="colorNote" title="Cambiar color"><svg><use href="#icon-drop"/></svg></button>
            <button class="deleteNote" title="Eliminar"><svg><use href="#icon-x"/></svg></button>
        </div>
        <div class="noteBody"></div>
        <div class="noteGrip" title="Redimensionar"><svg><use href="#icon-grip"/></svg></div>
    `

    // Collapse / expand
    note.querySelector('.collapseNote').addEventListener('click', () => {
        const collapsed = note.classList.contains('collapsed')
        if (!collapsed) note.dataset.fullHeight = note.offsetHeight   // remember the open height
        setCollapsed(note, !collapsed, true)
        saveNotes()
    })

    // drop the transition once it finishes, so resizing stays snappy
    note.addEventListener('transitionend', () => note.classList.remove('animating'))

    // Cycle to the next color and save
    note.querySelector('.colorNote').addEventListener('click', () => {
        const next = (NOTE_COLORS.indexOf(note.dataset.color) + 1) % NOTE_COLORS.length
        setNoteColor(note, NOTE_COLORS[next])
        saveNotes()
    })

    // load initial title and save whenever the user types
    const titleInput = note.querySelector('.noteTitle')
    titleInput.value = title
    titleInput.addEventListener('input', saveNotes)

    // Delete note: asks for a second click unless note is empty
    const deleteBtn = note.querySelector('.deleteNote')
    let confirmTimer = null

    deleteBtn.addEventListener('click', () => {
        const isEmpty = titleInput.value.trim === '' &&
            getBlocks(note).every(block => block.text.trim() === '')

        if (isEmpty || deleteBtn.classList.contains('confirm')) {
            clearTimeout(confirmTimer)
            note.remove()
            saveNotes()
            return
        }

        deleteBtn.classList.add('confirm')
        deleteBtn.title = 'Click de nuevo para borrar'
        confirmTimer = setTimeout(() => {
            deleteBtn.classList.remove('confirm')
            deleteBtn.title = 'Eliminar'
        }, 3000)
    })

    // Blocks: migrate old notes, and never leave a note empty
    if (!blocks) blocks = migrateBlocks({ text, items })
    if (blocks.length === 0) blocks.push({ type: 'text' })
    blocks.forEach(block => addBlock(note, block))

    // Header button: add a checkbox block at the end
    // Header button: toggle the type of the focused block, or add an item at the end
    const listBtn = note.querySelector('.listNote')
    listBtn.addEventListener('pointerdown', (event) => event.preventDefault()) // keep focus in the textarea
    listBtn.addEventListener('click', () => {
        const active = document.activeElement
        const row = active?.closest('.block')
        if (row && note.contains(row)) {
            setBlockType(row, row.dataset.type === 'item' ? 'text' : 'item')
            active.focus()
        } else {
            focusBlock(addBlock(note, { type: 'item' }))
        }
        saveNotes()
    })

    makeDraggable(note, note.querySelector('.noteHeader'), saveNotes)
    makeResizable(note, note.querySelector('.noteGrip'), saveNotes)
    canvas.appendChild(note)
    clampToCanvas(note)
    if (collapsed) setCollapsed(note, true)

    new ResizeObserver(() => {
        note.querySelectorAll('textarea').forEach(autoGrow)
    }).observe(note)
    note.querySelector('.blockText').focus()

    return note
}

// New segmented function for adding notes (will be used for shortcuts)
function addNote() {
    noteCount++
    createNote({ x: 120 + noteCount * 30, y: 120 + noteCount * 30})
    focusBlock(note.querySelector('.block'))
    saveNotes()
}

// Load on start
async function loadNotes() {
    const saved = await window.api.loadNotes()
    saved.forEach(createNote)
    saveNotes()
}

// 5. Master bar

// Listener for the "+" sign in the master bar
addNoteBtn.addEventListener('click', addNote)

// Make masterBar draggable as well
const masterBar = document.querySelector('.masterBar')
makeDraggable(masterBar, masterBar)

// Visibility toggle logic
const toggleNotesBtn = document.getElementById('toggleNotes')
let notesVisible = true

function toggleNotes() {
    notesVisible = !notesVisible
    canvas.classList.toggle('notesHidden', !notesVisible)
    toggleNotesBtn.querySelector('use').setAttribute('href', notesVisible ? '#icon-eye' : '#icon-eye-off')
}

function toggleBar() {
    masterBar.classList.toggle('hidden')
}

toggleNotesBtn.addEventListener('click', toggleNotes)

const editCanvasBtn = document.getElementById('editCanvas')
editCanvasBtn.addEventListener('click', () => {
    canvas.classList.toggle('editing')
})

// 6. Canvas: edit mode (move, resize, fit)

makeWindowHandle(document.getElementById('moveHandle'), (dx, dy) => {
    window.api.moveCanvas(dx, dy)
})

makeWindowHandle(document.getElementById('resizeHandle'), (dx, dy) => {
    window.api.resizeCanvas(dx, dy)
})

document.getElementById('fitHandle').addEventListener('click', () => {
    window.api.fitCanvas()
})

window.addEventListener('resize', () => {
    canvas.querySelectorAll('.note').forEach(clampToCanvas)
    saveNotes()
})

// 7. Global shortcuts (messages from main)

// global shortcut activation
window.api.onAddNote(addNote)
window.api.onToggleNotes(toggleNotes)
window.api.onToggleBar(toggleBar)

// 8. Startup

loadNotes()