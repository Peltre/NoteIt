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
        text: note.querySelector('.noteText').value,
        color: note.dataset.color,
        title: note.querySelector('.noteTitle').value,
        width: note.offsetWidth,
        height: note.offsetHeight,
        items: getItems(note)
    }))
    window.api.saveNotes(notes)
}

// Aux function to set note color
function setNoteColor(note, color) {
    note.dataset.color = color
    note.style.background = color
}

// Function to read the items of a list note from its rows
function getItems(note) {
    return [...note.querySelectorAll('.noteItem')].map(row => ({
        text: row.querySelector('.itemText').value,
        done: row.querySelector('.itemCheck').checked
    }))
}

// Add one item row into a list note
function addItemRow(note, { text = '', done = false }, after = null) {
    const row = document.createElement('div')
    row.className = 'noteItem'
    row.classList.toggle('done', done)
    row.innerHTML = `
        <input type="checkbox" class="itemCheck">
        <textarea class="itemText" placeholder="Nuevo elemento" rows="1" spellcheck="false"></textarea>
    `

    const check = row.querySelector('.itemCheck')
    const input = row.querySelector('.itemText')
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

    // one line per item for now
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault()
            const newRow = addItemRow(note, {}, row)
            newRow.querySelector('.itemText').focus()
            saveNotes()
        }

        // backspace on and empty item removes the line
        if (event.key === 'Backspace' && input.value === '') {
            event.preventDefault()
            const prev = row.previousElementSibling
            row.remove()
            if (prev) {
                const prevInput = prev.querySelector('.itemText')
                prevInput.focus()
                prevInput.setSelectionRange(prevInput.value.length, prevInput.value.length)
            } else {
                note.querySelector('.noteText').focus()
            }
            saveNotes()
        }
    })

    if (after) {
        after.insertAdjacentElement('afterend', row)
    } else {
        note.querySelector('.noteList').appendChild(row)
    }

    autoGrow(input)
    return row
}

// Add a list to a note, or clear it if every item is empty
function toggleList(note) {
    const list = note.querySelector('.noteList')
    const items = getItems(note)
    const allEmpty = items.length > 0 && items.every(item => item.text.trim() === '')

    if (allEmpty) {
        list.innerHTML = ''
    } else {
        const row = addItemRow(note, {})
        row.querySelector('.itemText').focus()
    }
    saveNotes()
}

// Make textarea as tall as its content
function autoGrow(textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
}

// Function to create a note
function createNote({ x, y, text = '', color = NOTE_COLORS[0], title = '', width = 220, height = 200, items = [] }) {
    const note = document.createElement('div')
    note.className = 'note interactive'
    note.style.left = x + 'px'
    note.style.top = y + 'px'
    note.style.width = width + 'px'
    note.style.height = height + 'px'
    setNoteColor(note, color)

    note.innerHTML = `
        <div class="noteHeader">
            <input class="noteTitle" placeholder="Título" spellcheck="false">
            <button class="listNote" title="Agregar lista">☑</button>
            <button class="colorNote" title="Cambiar color">●</button>
            <button class="deleteNote" title="Eliminar">✕</button>
        </div>
        <div class="noteBody">
            <textarea class="noteText" placeholder="Escribe aquí..." rows="1"></textarea>
            <div class="noteList"></div>
        </div>
        <div class="noteGrip" title="Redimensionar">◢</div>
    `

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

    // load initial text and save whenever the user types
    const textarea = note.querySelector('.noteText')
    textarea.value = text
    textarea.addEventListener('input', () => {
        autoGrow(textarea)
        saveNotes()
    })

    // del note and save
    note.querySelector('.deleteNote').addEventListener('click', () => {
        note.remove()
        saveNotes()
    })

    // load items and add listener
    items.forEach(item => addItemRow(note, item))
    // add a list or clear it when pressing btn
    note.querySelector('.listNote').addEventListener('click', () => toggleList(note))

    makeDraggable(note, note.querySelector('.noteHeader'), saveNotes)
    makeResizable(note, note.querySelector('.noteGrip'), saveNotes)
    canvas.appendChild(note)
    clampToCanvas(note)
    autoGrow(textarea)

    new ResizeObserver(() => {
        note.querySelectorAll('textarea').forEach(autoGrow)
    }).observe(note)
    textarea.focus()
}

// New segmented function for adding notes (will be used for shortcuts)
function addNote() {
    noteCount++
    createNote({ x: 120 + noteCount * 30, y: 120 + noteCount * 30})
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
    toggleNotesBtn.textContent = notesVisible ? '👁' : '-'
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