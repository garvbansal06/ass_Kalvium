const fileInput = document.getElementById('pdf-upload');
const canvas = document.getElementById('pdf-render');
const ctx = canvas.getContext('2d');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumDisplay = document.getElementById('page-num');
const pageCountDisplay = document.getElementById('page-count');
const activeUsersDisplay = document.getElementById('active-users');

let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let isAdmin = false;
let socket = io();

// Handle file input change (upload PDF)
fileInput.addEventListener('change', (e) => {
    if (isAdmin) {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            const fileReader = new FileReader();

            fileReader.onload = function () {
                const typedArray = new Uint8Array(this.result);

                // Send the PDF to the server to upload and broadcast it to all users
                socket.emit('upload-pdf', typedArray);

                // Load the PDF using PDF.js
                pdfjsLib.getDocument(typedArray).promise.then((pdf) => {
                    pdfDoc = pdf;
                    totalPages = pdfDoc.numPages;

                    // Update page count display
                    pageCountDisplay.textContent = totalPages;

                    // Render the first page
                    renderPage(currentPage);
                }).catch((error) => {
                    console.error("Error loading PDF: ", error);
                    alert("Failed to load PDF.");
                });
            };

            fileReader.readAsArrayBuffer(file);
        } else {
            alert('Please upload a valid PDF file.');
        }
    } else {
        alert('Only the admin can upload or change the PDF.');
    }
});

// Listen for the uploaded PDF from the server
socket.on('pdf-uploaded', (pdfData) => {
    pdfjsLib.getDocument(pdfData).promise.then((pdf) => {
        pdfDoc = pdf;
        totalPages = pdfDoc.numPages;

        // Update page count display
        pageCountDisplay.textContent = totalPages;

        // Render the first page
        renderPage(currentPage);
    }).catch((error) => {
        console.error("Error loading PDF: ", error);
        alert("Failed to load PDF.");
    });
});

// Listen if the user is the admin
socket.on('is-admin', (status) => {
    isAdmin = status;
    if (isAdmin) {
        alert("You are the admin, you can upload and change the PDF.");
    }
});

// Handle page change
function renderPage(pageNum) {
    pdfDoc.getPage(pageNum).then((page) => {
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport,
        };

        page.render(renderContext).promise.then(() => {
            // Update page number display after rendering
            pageNumDisplay.textContent = currentPage;
        }).catch((error) => {
            console.error("Error rendering page: ", error);
        });
    });

    // Emit the page change event to the server
    socket.emit('page-changed', pageNum);
}

// Button event listeners for navigating pages
prevPageBtn.addEventListener('click', () => {
    if (currentPage <= 1) return;
    currentPage--;
    renderPage(currentPage);
});

nextPageBtn.addEventListener('click', () => {
    if (currentPage >= totalPages) return;
    currentPage++;
    renderPage(currentPage);
});

// Listen for page change events from other users
socket.on('page-changed', (pageNum) => {
    currentPage = pageNum;
    renderPage(currentPage);
});

// Update the active user count display
socket.on('user-count', (activeUsers) => {
    activeUsersDisplay.textContent = "Active Users: " + activeUsers;
});
