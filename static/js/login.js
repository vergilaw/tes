const apiUrl = 'http://127.0.0.1:5000/api';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            login();
        });
    }
});

function showMessage(message, isSuccess, elementId = 'message') {
    const msgElement = document.getElementById(elementId);
    msgElement.textContent = message;
    msgElement.classList.remove('d-none', 'alert-success', 'alert-danger');
    msgElement.classList.add('alert', isSuccess ? 'alert-success' : 'alert-danger');
}

function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!username || !password) {
        showMessage('Vui lòng nhập đầy đủ thông tin!', false);
        return;
    }
    fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showMessage(data.error, false);
        } else {
            showMessage(data.message, true);
            setTimeout(() => window.location.href = data.redirect, 1000);
        }
    })
    .catch(error => showMessage('Lỗi kết nối server!', false));
}