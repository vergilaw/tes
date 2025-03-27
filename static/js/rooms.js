const apiUrl = 'http://127.0.0.1:5000/api';

document.addEventListener('DOMContentLoaded', function() {
    const roomList = document.getElementById('roomList');
    if (roomList) {
        loadHotels();
        loadRooms();
        document.getElementById('logoutBtn').addEventListener('click', function() {
            fetch(`${apiUrl}/logout`, { method: 'POST' })
                .then(response => response.json())
                .then(data => window.location.href = data.redirect);
        });
        document.getElementById('viewBookingsBtn').addEventListener('click', function() {
            loadBookings();
            const bookingsModal = new bootstrap.Modal(document.getElementById('bookingsModal'));
            bookingsModal.show();
        });
        document.getElementById('addRoomBtn')?.addEventListener('click', function() {
            const addRoomModal = new bootstrap.Modal(document.getElementById('addRoomModal'));
            addRoomModal.show();
        });
        document.getElementById('manageUsersBtn')?.addEventListener('click', function() {
            loadUsers();
            const manageUsersModal = new bootstrap.Modal(document.getElementById('manageUsersModal'));
            manageUsersModal.show();
        });
        document.getElementById('hotelFilter').addEventListener('change', function() {
            loadRooms(this.value);
        });
        document.getElementById('sortPriceFilter').addEventListener('change', function() {
            const hotelId = document.getElementById('hotelFilter').value;
            const capacity = document.getElementById('capacityFilter').value;
            loadRooms(hotelId, this.value, capacity);
        });
        document.getElementById('capacityFilter').addEventListener('change', function() {
            const hotelId = document.getElementById('hotelFilter').value;
            const sortPrice = document.getElementById('sortPriceFilter').value;
            loadRooms(hotelId, sortPrice, this.value);
        });
    }

    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createBooking();
        });
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('checkInDate').min = today;
        document.getElementById('checkOutDate').min = today;
        document.getElementById('checkInDate').addEventListener('change', function() {
            const checkInDate = this.value;
            document.getElementById('checkOutDate').min = checkInDate;
            if (document.getElementById('checkOutDate').value < checkInDate) {
                document.getElementById('checkOutDate').value = '';
            }
        });
    }

    const addRoomForm = document.getElementById('addRoomForm');
    if (addRoomForm) {
        addRoomForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addRoom();
        });
    }

    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addUser();
        });
    }

    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            editUser();
        });
    }

    const editBookingForm = document.getElementById('editBookingForm');
    if (editBookingForm) {
        editBookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const bookingId = document.getElementById('editBookingId').value;
            const guestName = document.getElementById('editGuestName').value.trim();
            const guestEmail = document.getElementById('editGuestEmail').value.trim();
            const checkIn = document.getElementById('editCheckInDate').value;
            const checkOut = document.getElementById('editCheckOutDate').value;

            if (!guestName || !guestEmail || !checkIn || !checkOut) {
                showMessage('Vui lòng điền đầy đủ thông tin!', false, 'editBookingMessage');
                return;
            }
            if (new Date(checkIn) >= new Date(checkOut)) {
                showMessage('Ngày trả phòng phải sau ngày nhận phòng!', false, 'editBookingMessage');
                return;
            }

            fetch(`${apiUrl}/bookings/${bookingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guest_name: guestName,
                    guest_email: guestEmail,
                    check_in: checkIn,
                    check_out: checkOut
                })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errorData => {
                        throw new Error(errorData.error || 'Lỗi không xác định');
                    });
                }
                return response.json();
            })
            .then(data => {
                showMessage(data.message, true, 'editBookingMessage');
                loadBookings();
                loadRooms();
                setTimeout(() => {
                    bootstrap.Modal.getInstance(document.getElementById('editBookingModal')).hide();
                }, 2000);
            })
            .catch(error => showMessage(error.message, false, 'editBookingMessage'));
        });
    }
});

function showMessage(message, isSuccess, elementId = 'message') {
    const msgElement = document.getElementById(elementId);
    msgElement.textContent = message;
    msgElement.classList.remove('d-none', 'alert-success', 'alert-danger');
    msgElement.classList.add('alert', isSuccess ? 'alert-success' : 'alert-danger');
}

function loadHotels() {
    fetch(`${apiUrl}/hotels`)
        .then(response => response.json())
        .then(hotels => {
            const hotelFilter = document.getElementById('hotelFilter');
            const addHotelId = document.getElementById('addHotelId');
            hotelFilter.innerHTML = '<option value="">Tất cả khách sạn</option>';
            addHotelId.innerHTML = '';
            hotels.forEach(hotel => {
                const filterOption = document.createElement('option');
                filterOption.value = hotel.id;
                filterOption.textContent = hotel.name;
                hotelFilter.appendChild(filterOption);

                const addOption = document.createElement('option');
                addOption.value = hotel.id;
                addOption.textContent = hotel.name;
                addHotelId.appendChild(addOption);
            });
        })
        .catch(error => console.error('Lỗi tải khách sạn:', error));
}

function loadRooms(hotelId = '', sortPrice = '', capacity = '') {
    let url = `${apiUrl}/rooms`;
    const params = new URLSearchParams();
    if (hotelId) params.append('hotel_id', hotelId);
    if (sortPrice) params.append('sort_price', sortPrice);
    if (capacity) params.append('capacity', capacity);
    if (params.toString()) url += `?${params.toString()}`;

    fetch(url)
        .then(response => response.json())
        .then(rooms => {
            const roomList = document.getElementById('roomList');
            roomList.innerHTML = '';
            if (rooms.length === 0) {
                roomList.innerHTML = '<div class="col-12"><p class="text-center">Không có phòng nào phù hợp.</p></div>';
                return;
            }
            rooms.forEach(room => {
                const imageUrl = room.image_url || 'https://via.placeholder.com/200';
                const roomCard = document.createElement('div');
                roomCard.className = 'col-md-4';
                roomCard.innerHTML = `
                    <div class="card room-card">
                        <img src="${imageUrl}" class="card-img-top" alt="${room.room_type}" onerror="this.src='https://via.placeholder.com/200';">
                        <div class="card-body">
                            <h5 class="card-title">${room.hotel_name} - Phòng ${room.room_number} (${room.room_type})</h5>
                            <p class="card-text">${room.description}</p>
                            <p class="card-text">
                                <i class="bi bi-people-fill"></i> Sức chứa: ${room.capacity} người<br>
                                <i class="bi bi-currency-dollar"></i> Giá: ${room.price_per_night.toLocaleString()} VNĐ/đêm
                            </p>
                            <button class="btn btn-primary book-btn" data-id="${room.id}" 
                                    data-room="${room.room_number}" data-type="${room.room_type}" 
                                    data-price="${room.price_per_night}" data-hotel="${room.hotel_name}">
                                Đặt phòng
                            </button>
                            <button class="btn btn-info detail-btn ms-2" data-id="${room.id}" 
                                    data-hotel="${room.hotel_name}" data-room="${room.room_number}" 
                                    data-type="${room.room_type}" data-price="${room.price_per_night}" 
                                    data-capacity="${room.capacity}" data-description="${room.description}" 
                                    data-available="${room.available}" data-image="${imageUrl}"
                                    data-booking-info='${JSON.stringify(room.booking_info)}'>
                                Xem chi tiết
                            </button>
                        </div>
                    </div>
                `;
                roomList.appendChild(roomCard);
            });
            document.querySelectorAll('.book-btn').forEach(button => {
                button.addEventListener('click', function() {
                    openBookingModal(
                        this.getAttribute('data-id'),
                        this.getAttribute('data-room'),
                        this.getAttribute('data-type'),
                        this.getAttribute('data-price'),
                        this.getAttribute('data-hotel')
                    );
                });
            });
            document.querySelectorAll('.detail-btn').forEach(button => {
                button.addEventListener('click', function() {
                    openDetailModal(
                        this.getAttribute('data-id'),
                        this.getAttribute('data-hotel'),
                        this.getAttribute('data-room'),
                        this.getAttribute('data-type'),
                        this.getAttribute('data-price'),
                        this.getAttribute('data-capacity'),
                        this.getAttribute('data-description'),
                        this.getAttribute('data-available'),
                        this.getAttribute('data-image'),
                        this.getAttribute('data-booking-info')
                    );
                });
            });
        })
        .catch(error => showMessage('Không thể tải danh sách phòng!', false));
}

function openBookingModal(roomId, roomNumber, roomType, price, hotelName) {
    document.getElementById('roomId').value = roomId;
    document.getElementById('roomInfo').value = `${hotelName} - Phòng ${roomNumber} (${roomType})`;
    document.getElementById('pricePerNight').value = Number(price).toLocaleString();
    const bookingModal = new bootstrap.Modal(document.getElementById('bookingModal'));
    bookingModal.show();
}

function openDetailModal(roomId, hotelName, roomNumber, roomType, price, capacity, description, available, imageUrl, bookingInfo) {
    document.getElementById('detailHotelName').textContent = hotelName;
    document.getElementById('detailRoomNumber').textContent = roomNumber;
    document.getElementById('detailRoomType').textContent = roomType;
    document.getElementById('detailPrice').textContent = Number(price).toLocaleString();
    document.getElementById('detailCapacity').textContent = capacity;
    document.getElementById('detailDescription').textContent = description || 'Không có mô tả';

    const bookingData = bookingInfo ? JSON.parse(bookingInfo) : null;
    const currentDate = new Date();
    const isCurrentlyBooked = bookingData &&
        new Date(bookingData.check_in) <= currentDate &&
        new Date(bookingData.check_out) >= currentDate;

    document.getElementById('detailAvailable').textContent = bookingData
        ? `Phòng đã được đặt từ ${bookingData.check_in} đến ${bookingData.check_out}`
        : 'Còn trống';
    document.getElementById('detailImage').src = imageUrl;

    const deleteBtn = document.getElementById('deleteRoomBtn');
    const editBtn = document.getElementById('editRoomBtn');

    if (deleteBtn) {
        deleteBtn.onclick = function() {
            if (isCurrentlyBooked) {
                alert("Không thể xóa phòng vì đang có lịch đặt còn hiệu lực!");
                return;
            }
            if (confirm('Bạn có chắc chắn muốn xóa phòng này không?')) {
                fetch(`${apiUrl}/rooms/${roomId}`, {
                    method: 'DELETE'
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(errorData => {
                            throw new Error(errorData.error || 'Lỗi không xác định');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    alert(data.message);
                    loadRooms();
                    bootstrap.Modal.getInstance(document.getElementById('roomDetailModal')).hide();
                })
                .catch(error => alert(error.message));
            }
        };
    }

    if (editBtn) {
        editBtn.onclick = function() {
            if (isCurrentlyBooked) {
                alert("Không thể sửa phòng vì đang có lịch đặt còn hiệu lực!");
                return;
            }
            const modalBody = document.querySelector('#roomDetailModal .modal-body');
            modalBody.innerHTML = `
                <form id="editRoomForm" enctype="multipart/form-data">
                    <div class="mb-3">
                        <label class="form-label">Khách sạn</label>
                        <input type="text" class="form-control" name="hotel_name" value="${hotelName}" disabled>
                        <input type="hidden" name="hotel_id" value="${roomId.split('-')[0] || roomId}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Số phòng</label>
                        <input type="text" class="form-control" name="room_number" value="${roomNumber}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Loại phòng</label>
                        <select class="form-select" name="room_type" required>
                            <option value="Standard" ${roomType === 'Standard' ? 'selected' : ''}>Standard</option>
                            <option value="Deluxe" ${roomType === 'Deluxe' ? 'selected' : ''}>Deluxe</option>
                            <option value="Suite" ${roomType === 'Suite' ? 'selected' : ''}>Suite</option>
                            <option value="Family" ${roomType === 'Family' ? 'selected' : ''}>Family</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Giá mỗi đêm (VNĐ)</label>
                        <input type="number" class="form-control" name="price_per_night" value="${price}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Sức chứa (người)</label>
                        <input type="number" class="form-control" name="capacity" value="${capacity}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Mô tả</label>
                        <textarea class="form-control" name="description">${description || ''}</textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Ảnh phòng (nếu muốn thay đổi)</label>
                        <input type="file" class="form-control" name="image" accept="image/*">
                    </div>
                    <div id="editRoomMessage" class="alert d-none mb-3"></div>
                    <button type="submit" class="btn btn-primary">Lưu thay đổi</button>
                </form>
            `;

            document.getElementById('editRoomForm').addEventListener('submit', function(e) {
                e.preventDefault();
                const formData = new FormData(this);
                fetch(`${apiUrl}/rooms/${roomId}`, {
                    method: 'PUT',
                    body: formData
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(errorData => {
                            throw new Error(errorData.error || 'Lỗi không xác định');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    showMessage(data.message, true, 'editRoomMessage');
                    loadRooms();
                    setTimeout(() => {
                        bootstrap.Modal.getInstance(document.getElementById('roomDetailModal')).hide();
                    }, 2000);
                })
                .catch(error => showMessage(error.message, false, 'editRoomMessage'));
            });
        };
    }

    const detailModal = new bootstrap.Modal(document.getElementById('roomDetailModal'));
    detailModal.show();
}

function createBooking() {
    const roomId = document.getElementById('roomId').value;
    const guestName = document.getElementById('guestName').value.trim();
    const guestEmail = document.getElementById('guestEmail').value.trim();
    const checkIn = document.getElementById('checkInDate').value;
    const checkOut = document.getElementById('checkOutDate').value;

    if (!roomId || !guestName || !guestEmail || !checkIn || !checkOut) {
        showMessage('Vui lòng điền đầy đủ thông tin!', false, 'bookingMessage');
        return;
    }
    if (new Date(checkIn) >= new Date(checkOut)) {
        showMessage('Ngày trả phòng phải sau ngày nhận phòng!', false, 'bookingMessage');
        return;
    }

    fetch(`${apiUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            room_id: roomId,
            guest_name: guestName,
            guest_email: guestEmail,
            check_in: checkIn,
            check_out: checkOut
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.error || 'Lỗi không xác định');
            });
        }
        return response.json();
    })
    .then(data => {
        showMessage(data.message, true, 'bookingMessage');
        document.getElementById('bookingForm').reset();
        setTimeout(() => {
            bootstrap.Modal.getInstance(document.getElementById('bookingModal')).hide();
            loadRooms();
        }, 2000);
    })
    .catch(error => showMessage(`Lỗi khi đặt phòng: ${error.message}`, false, 'bookingMessage'));
}

function loadBookings() {
    fetch(`${apiUrl}/bookings`)
        .then(response => response.json())
        .then(bookings => {
            const bookingsList = document.getElementById('bookingsList');
            bookingsList.innerHTML = '';
            if (bookings.length === 0) {
                bookingsList.innerHTML = '<tr><td colspan="7" class="text-center">Không có đặt phòng nào.</td></tr>';
                return;
            }
            bookings.forEach(booking => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${booking.id}</td>
                    <td>${booking.hotel_name} - ${booking.room_number} (${booking.room_type})</td>
                    <td>${booking.guest_name}</td>
                    <td>${booking.check_in_date}</td>
                    <td>${booking.check_out_date}</td>
                    <td>${booking.total_price.toLocaleString()} VNĐ</td>
                    ${document.getElementById('editBookingModal') ? `
                        <td>
                            <button class="btn btn-warning btn-sm edit-booking-btn" 
                                    data-id="${booking.id}" 
                                    data-room="${booking.hotel_name} - ${booking.room_number} (${booking.room_type})" 
                                    data-guest="${booking.guest_name}" 
                                    data-email="${booking.guest_email}" 
                                    data-checkin="${booking.check_in_date}" 
                                    data-checkout="${booking.check_out_date}">
                                Sửa
                            </button>
                            <button class="btn btn-danger btn-sm delete-booking-btn ms-1" data-id="${booking.id}">
                                Xóa
                            </button>
                        </td>
                    ` : ''}
                `;
                bookingsList.appendChild(row);
            });

            document.querySelectorAll('.edit-booking-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const bookingId = this.getAttribute('data-id');
                    const roomInfo = this.getAttribute('data-room');
                    const guestName = this.getAttribute('data-guest');
                    const guestEmail = this.getAttribute('data-email');
                    const checkIn = this.getAttribute('data-checkin');
                    const checkOut = this.getAttribute('data-checkout');

                    document.getElementById('editBookingId').value = bookingId;
                    document.getElementById('editRoomInfo').value = roomInfo;
                    document.getElementById('editGuestName').value = guestName;
                    document.getElementById('editGuestEmail').value = guestEmail;
                    document.getElementById('editCheckInDate').value = checkIn;
                    document.getElementById('editCheckOutDate').value = checkOut;

                    const editModal = new bootstrap.Modal(document.getElementById('editBookingModal'));
                    editModal.show();
                });
            });

            document.querySelectorAll('.delete-booking-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const bookingId = this.getAttribute('data-id');
                    if (confirm('Bạn có chắc chắn muốn xóa đặt phòng này không?')) {
                        fetch(`${apiUrl}/bookings/${bookingId}`, {
                            method: 'DELETE'
                        })
                        .then(response => {
                            if (!response.ok) {
                                return response.json().then(errorData => {
                                    throw new Error(errorData.error || 'Lỗi không xác định');
                                });
                            }
                            return response.json();
                        })
                        .then(data => {
                            alert(data.message);
                            loadBookings();
                            loadRooms();
                        })
                        .catch(error => alert(error.message));
                    }
                });
            });
        })
        .catch(error => showMessage('Không thể tải danh sách đặt phòng!', false));
}

function addRoom() {
    const form = document.getElementById('addRoomForm');
    const formData = new FormData(form);

    fetch(`${apiUrl}/rooms`, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.error || 'Lỗi không xác định');
            });
        }
        return response.json();
    })
    .then(data => {
        showMessage(data.message, true, 'addRoomMessage');
        document.getElementById('addRoomForm').reset();
        loadRooms();
        setTimeout(() => {
            bootstrap.Modal.getInstance(document.getElementById('addRoomModal')).hide();
        }, 2000);
    })
    .catch(error => showMessage(error.message, false, 'addRoomMessage'));
}

function loadUsers() {
    fetch(`${apiUrl}/users`)
        .then(response => response.json())
        .then(users => {
            const usersList = document.getElementById('usersList');
            usersList.innerHTML = '';
            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.role === 'admin' ? 'Admin' : 'Người dùng'}</td>
                    <td>
                        <button class="btn btn-warning btn-sm edit-user-btn" 
                                data-id="${user.id}" 
                                data-username="${user.username}" 
                                data-role="${user.role}">
                            Sửa
                        </button>
                        <button class="btn btn-danger btn-sm delete-user-btn ms-1" data-id="${user.id}">
                            Xóa
                        </button>
                    </td>
                `;
                usersList.appendChild(row);
            });

            document.querySelectorAll('.edit-user-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const userId = this.getAttribute('data-id');
                    const username = this.getAttribute('data-username');
                    const role = this.getAttribute('data-role');

                    document.getElementById('editUserId').value = userId;
                    document.getElementById('editUsername').value = username;
                    document.getElementById('editPassword').value = '';
                    document.getElementById('editRole').value = role;

                    const editModal = new bootstrap.Modal(document.getElementById('editUserModal'));
                    editModal.show();
                });
            });

            document.querySelectorAll('.delete-user-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const userId = this.getAttribute('data-id');
                    if (confirm('Bạn có chắc chắn muốn xóa tài khoản này không?')) {
                        fetch(`${apiUrl}/users/${userId}`, {
                            method: 'DELETE'
                        })
                        .then(response => {
                            if (!response.ok) {
                                return response.json().then(errorData => {
                                    throw new Error(errorData.error || 'Lỗi không xác định');
                                });
                            }
                            return response.json();
                        })
                        .then(data => {
                            alert(data.message);
                            loadUsers();
                        })
                        .catch(error => alert(error.message));
                    }
                });
            });
        })
        .catch(error => showMessage('Không thể tải danh sách tài khoản!', false));
}

function addUser() {
    const username = document.getElementById('addUserUsername').value.trim();
    const password = document.getElementById('addUserPassword').value.trim();
    const role = document.getElementById('addUserRole').value;

    if (!username || !password) {
        showMessage('Vui lòng điền đầy đủ thông tin!', false, 'addUserMessage');
        return;
    }

    fetch(`${apiUrl}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.error || 'Lỗi không xác định');
            });
        }
        return response.json();
    })
    .then(data => {
        showMessage(data.message, true, 'addUserMessage');
        document.getElementById('addUserForm').reset();
        loadUsers();
    })
    .catch(error => showMessage(error.message, false, 'addUserMessage'));
}

function editUser() {
    const userId = document.getElementById('editUserId').value;
    const username = document.getElementById('editUsername').value.trim();
    const password = document.getElementById('editPassword').value.trim();
    const role = document.getElementById('editRole').value;

    if (!username || !password) {
        showMessage('Vui lòng điền đầy đủ thông tin!', false, 'editUserMessage');
        return;
    }

    fetch(`${apiUrl}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.error || 'Lỗi không xác định');
            });
        }
        return response.json();
    })
    .then(data => {
        showMessage(data.message, true, 'editUserMessage');
        loadUsers();
        setTimeout(() => {
            bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
        }, 2000);
    })
    .catch(error => showMessage(error.message, false, 'editUserMessage'));
}