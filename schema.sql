create database HotelDB
-- Sử dụng database HotelDB
USE HotelDB;
GO

-- Xóa dữ liệu cũ và bảng nếu cần
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Booking')
    DROP TABLE Booking;
GO
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Room')
    DROP TABLE Room;
GO
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Hotel')
    DROP TABLE Hotel;
GO
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'User')
    DROP TABLE [User];
GO

-- Tạo bảng User
CREATE TABLE [User] (
    id INT PRIMARY KEY IDENTITY(1,1),
    username NVARCHAR(50) NOT NULL UNIQUE,
    password NVARCHAR(50) NOT NULL,
    role NVARCHAR(20) DEFAULT 'user'
);
GO

-- Tạo bảng Hotel
CREATE TABLE Hotel (
    id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(100) NOT NULL,
    location NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX)
);
GO

-- Tạo bảng Room
CREATE TABLE Room (
    id INT PRIMARY KEY IDENTITY(1,1),
    hotel_id INT NOT NULL,
    room_number NVARCHAR(10) NOT NULL,
    room_type NVARCHAR(50) NOT NULL,
    price_per_night FLOAT NOT NULL,
    capacity INT NOT NULL,
    description NVARCHAR(MAX),
    available BIT DEFAULT 1,
    image_url NVARCHAR(255),
    CONSTRAINT FK_Room_Hotel FOREIGN KEY (hotel_id) REFERENCES Hotel(id),
    CONSTRAINT UQ_Hotel_Room UNIQUE (hotel_id, room_number)
);
GO

-- Tạo bảng Booking
CREATE TABLE Booking (
    id INT PRIMARY KEY IDENTITY(1,1),
    room_id INT NOT NULL,
    guest_name NVARCHAR(100) NOT NULL,
    guest_email NVARCHAR(100) NOT NULL,
    check_in_date DATETIME NOT NULL,
    check_out_date DATETIME NOT NULL,
    booking_date DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (room_id) REFERENCES Room(id)
);
GO

DELETE FROM Booking;
DELETE FROM Room;
DELETE FROM Hotel;
DELETE FROM [User];
GO
-- Reset IDENTITY
DBCC CHECKIDENT ('User', RESEED, 0);
DBCC CHECKIDENT ('Hotel', RESEED, 0);
DBCC CHECKIDENT ('Room', RESEED, 0);
DBCC CHECKIDENT ('Booking', RESEED, 0);
GO

-- Chèn dữ liệu User
INSERT INTO [User] (username, password, role)
VALUES
    ('admin', '12345', 'admin'),
    ('user', '67890', 'user');
GO

-- Chèn dữ liệu Hotel
INSERT INTO Hotel (name, location, description)
VALUES
    ('Khách sạn Sunrise', 'Hà Nội', 'Khách sạn 5 sao tại trung tâm thủ đô'),
    ('Khách sạn Ocean View', 'Đà Nẵng', 'Khách sạn ven biển với view đẹp'),
    ('Khách sạn Green Hill', 'Đà Lạt', 'Khách sạn nghỉ dưỡng giữa rừng thông'),
    ('Khách sạn Golden Star', 'TP. Hồ Chí Minh', 'Khách sạn sang trọng tại quận 1'),
    ('Khách sạn Pearl River', 'Hội An', 'Khách sạn phong cách cổ điển gần phố cổ');
GO

-- Chèn dữ liệu Room
INSERT INTO Room (hotel_id, room_number, room_type, price_per_night, capacity, description, available, image_url)
VALUES
    -- Khách sạn Sunrise (id = 1)
    (1, '101', 'Standard', 600000, 2, 'Phòng tiêu chuẩn với giường đôi', 1, 'https://images.unsplash.com/photo-1566665797739-1674de7a421a'),
    (1, '102', 'Deluxe', 900000, 2, 'Phòng cao cấp với ban công', 1, 'https://images.unsplash.com/photo-1590490360182-c33d57733427'),
    (1, '103', 'Suite', 1500000, 4, 'Phòng Suite với phòng khách riêng', 1, 'https://images.unsplash.com/photo-1591088398332-8a7791972843'),
    (1, '104', 'Family', 1100000, 3, 'Phòng gia đình với giường tầng', 1, 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461'),

    -- Khách sạn Ocean View (id = 2)
    (2, '201', 'Standard', 700000, 2, 'Phòng tiêu chuẩn, view biển', 1, 'https://images.unsplash.com/photo-1611892440504-42a792e24d32'),
    (2, '202', 'Deluxe', 1000000, 2, 'Phòng cao cấp với bồn tắm', 1, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c'),
    (2, '203', 'Suite', 1600000, 4, 'Phòng Suite sang trọng', 1, 'https://images.unsplash.com/photo-1600585154526-990dced4cb0d'),
    (2, '204', 'Family', 1200000, 3, 'Phòng gia đình gần bãi biển', 1, 'https://images.unsplash.com/photo-1616046229478-9901c5536a45'),

    -- Khách sạn Green Hill (id = 3)
    (3, '301', 'Standard', 550000, 2, 'Phòng tiêu chuẩn giữa rừng thông', 1, 'https://images.unsplash.com/photo-1621293954908-907159247fc8'),
    (3, '302', 'Deluxe', 850000, 2, 'Phòng cao cấp với lò sưởi', 1, 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9'),
    (3, '303', 'Suite', 1400000, 4, 'Phòng Suite với view đồi', 1, 'https://images.unsplash.com/photo-1598928508446-7d47d5c4e9d5'),
    (3, '304', 'Family', 950000, 3, 'Phòng gia đình ấm cúng', 1, 'https://images.unsplash.com/photo-1600585154084-4e5fe7c39198'),

    -- Khách sạn Golden Star (id = 4)
    (4, '401', 'Standard', 650000, 2, 'Phòng tiêu chuẩn tại trung tâm', 1, 'https://images.unsplash.com/photo-1618773928121-c3222925c79f'),
    (4, '402', 'Deluxe', 950000, 2, 'Phòng cao cấp với view thành phố', 1, 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6'),
    (4, '403', 'Suite', 1550000, 4, 'Phòng Suite hiện đại', 1, 'https://images.unsplash.com/photo-1571501679685-57d14e873a9f'),
    (4, '404', 'Family', 1150000, 3, 'Phòng gia đình rộng rãi', 1, 'https://images.unsplash.com/photo-1591085686350-79815ed2cebc'),

    -- Khách sạn Pearl River (id = 5)
    (5, '501', 'Standard', 600000, 2, 'Phòng tiêu chuẩn phong cách cổ', 1, 'https://images.unsplash.com/photo-1598928636135-d146006ff4be'),
    (5, '502', 'Deluxe', 900000, 2, 'Phòng cao cấp gần phố cổ', 1, 'https://images.unsplash.com/photo-1600585153490-76fb20a0f2bc'),
    (5, '503', 'Suite', 1450000, 4, 'Phòng Suite với sân vườn', 1, 'https://images.unsplash.com/photo-1591088398332-8a7791972843'),
    (5, '504', 'Family', 1050000, 3, 'Phòng gia đình gần sông', 1, 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461');
GO

-- Chèn dữ liệu Booking
INSERT INTO Booking (room_id, guest_name, guest_email, check_in_date, check_out_date)
VALUES
    (1, 'Nguyen Van A', 'nguyenvana@example.com', '2025-03-20', '2025-03-22'),
    (5, 'Tran Thi B', 'tranthib@example.com', '2025-03-21', '2025-03-23'),
    (9, 'Le Van C', 'levanc@example.com', '2025-03-22', '2025-03-24'),
    (13, 'Pham Thi D', 'phamthid@example.com', '2025-03-23', '2025-03-25'),
    (17, 'Hoang Van E', 'hoangvane@example.com', '2025-03-24', '2025-03-26');
GO

-- Kiểm tra dữ liệu
SELECT * FROM [User];
SELECT * FROM Hotel;
SELECT * FROM Room;
SELECT * FROM Booking;
GO
