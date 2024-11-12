const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Store uploaded PDF data
let currentPdfData = null;
let activeUsers = 0;
let adminSocketId = null;  // Store admin socket id

// Serve static files (like the client-side JS and CSS)
app.use(express.static('public'));

// Track active users
io.on('connection', (socket) => {
    activeUsers++;
    io.emit('user-count', activeUsers);  // Broadcast active user count to all users

    // Set the first user who connects as admin
    if (adminSocketId === null) {
        adminSocketId = socket.id;  // First connected user becomes admin
        socket.emit('is-admin', true); // Inform admin that they have control
    } else {
        socket.emit('is-admin', false); // Inform other users that they are viewers
    }

    // Send current PDF to new users if it is already uploaded
    if (currentPdfData) {
        socket.emit('pdf-uploaded', currentPdfData);
    }

    // When a user disconnects
    socket.on('disconnect', () => {
        activeUsers--;
        io.emit('user-count', activeUsers);
        if (socket.id === adminSocketId) {
            // If admin disconnects, make the next connected user the admin
            adminSocketId = null;
            io.emit('admin-disconnected');
        }
    });

    // Handle page change requests (Only admin can change the page)
    socket.on('page-changed', (pageNum) => {
        if (socket.id === adminSocketId) {
            // Broadcast to all viewers (except admin) when the admin changes page
            socket.broadcast.emit('page-changed', pageNum);
        }
    });

    // Handle PDF upload by admin
    socket.on('upload-pdf', (pdfData) => {
        if (socket.id === adminSocketId) {
            currentPdfData = pdfData;  // Save the uploaded PDF data
            io.emit('pdf-uploaded', currentPdfData);  // Broadcast the uploaded PDF to all users
        } else {
            socket.emit('not-authorized', 'Only the admin can upload or change the PDF.');
        }
    });
});

// Start the server on port 3000
server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
