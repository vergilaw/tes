from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from functools import wraps
from datetime import datetime
import os
from werkzeug.utils import secure_filename

app = Flask(__name__, template_folder='html', static_folder='static')
app.secret_key = 'your_secret_key_here'  # Thay bằng một khóa bí mật an toàn
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] ='mssql+pyodbc://HAN\\SQLEXPRESS01/HotelDB?driver=ODBC+Driver+17+for+SQL+Server&Trusted_Connection=yes'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(app.static_folder, 'images')
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}
db = SQLAlchemy(app)

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# Decorator kiểm tra đăng nhập
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('serve_login'))
        return f(*args, **kwargs)
    return decorated_function

# Decorator kiểm tra quyền admin
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or session.get('role') != 'admin':
            return jsonify({"error": "Bạn không có quyền truy cập"}), 403
        return f(*args, **kwargs)
    return decorated_function

class User(db.Model):
    __tablename__ = 'User'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(50), nullable=False)
    role = db.Column(db.String(20), default='user')  # 'admin' hoặc 'user'

    def to_dict(self):
        return {'id': self.id, 'username': self.username, 'role': self.role}

class Hotel(db.Model):
    __tablename__ = 'Hotel'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'location': self.location, 'description': self.description}

class Room(db.Model):
    __tablename__ = 'Room'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    hotel_id = db.Column(db.Integer, db.ForeignKey('Hotel.id'), nullable=False)
    room_number = db.Column(db.String(10), nullable=False)
    room_type = db.Column(db.String(50), nullable=False)
    price_per_night = db.Column(db.Float, nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    description = db.Column(db.Text)
    available = db.Column(db.Boolean, default=True)
    image_url = db.Column(db.String(255))
    hotel = db.relationship('Hotel', backref='rooms')

    def to_dict(self):
        bookings = Booking.query.filter_by(room_id=self.id).all()
        booking_info = None
        current_date = datetime.now()
        for booking in bookings:
            if booking.check_in_date <= current_date <= booking.check_out_date or booking.check_in_date > current_date:
                booking_info = {
                    'check_in': booking.check_in_date.strftime('%Y-%m-%d'),
                    'check_out': booking.check_out_date.strftime('%Y-%m-%d')
                }
                break
        return {
            'id': self.id, 'hotel_id': self.hotel_id, 'hotel_name': self.hotel.name,
            'room_number': self.room_number, 'room_type': self.room_type,
            'price_per_night': self.price_per_night, 'capacity': self.capacity,
            'description': self.description, 'available': self.available,
            'image_url': self.image_url, 'booking_info': booking_info
        }

class Booking(db.Model):
    __tablename__ = 'Booking'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    room_id = db.Column(db.Integer, db.ForeignKey('Room.id'), nullable=False)
    guest_name = db.Column(db.String(100), nullable=False)
    guest_email = db.Column(db.String(100), nullable=False)
    check_in_date = db.Column(db.DateTime, nullable=False)
    check_out_date = db.Column(db.DateTime, nullable=False)
    booking_date = db.Column(db.DateTime, default=datetime.now)
    room = db.relationship('Room', backref='bookings')

    def to_dict(self):
        return {
            'id': self.id, 'room_id': self.room_id, 'hotel_name': self.room.hotel.name,
            'room_number': self.room.room_number, 'room_type': self.room.room_type,
            'guest_name': self.guest_name, 'guest_email': self.guest_email,
            'check_in_date': self.check_in_date.strftime('%Y-%m-%d'),
            'check_out_date': self.check_out_date.strftime('%Y-%m-%d'),
            'booking_date': self.booking_date.strftime('%Y-%m-%d %H:%M'),
            'total_price': (self.check_out_date - self.check_in_date).days * self.room.price_per_night
        }

def create_tables():
    db.create_all()
    if not User.query.filter_by(username='admin').first():
        default_admin = User(username='admin', password='12345', role='admin')
        db.session.add(default_admin)
        db.session.commit()
    if not User.query.filter_by(username='user').first():
        default_user = User(username='user', password='67890', role='user')
        db.session.add(default_user)
        db.session.commit()

@app.route('/')
def serve_login():
    return render_template('login.html')

@app.route('/rooms')
@login_required
def serve_rooms():
    return render_template('rooms.html', user_role=session.get('role'))

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    user = User.query.filter_by(username=username, password=password).first()
    if user:
        session['user_id'] = user.id
        session['role'] = user.role
        return jsonify({"message": "Đăng nhập thành công", "redirect": "/rooms"}), 200
    return jsonify({"error": "Tên đăng nhập hoặc mật khẩu không đúng"}), 401

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    session.pop('user_id', None)
    session.pop('role', None)
    return jsonify({"message": "Đăng xuất thành công", "redirect": "/"}), 200

@app.route('/api/hotels', methods=['GET'])
@login_required
def get_hotels():
    hotels = Hotel.query.all()
    return jsonify([hotel.to_dict() for hotel in hotels])

@app.route('/api/rooms', methods=['GET'])
@login_required
def get_rooms():
    hotel_id = request.args.get('hotel_id')
    sort_price = request.args.get('sort_price')
    capacity = request.args.get('capacity', type=int)
    query = Room.query
    if hotel_id:
        query = query.filter_by(hotel_id=hotel_id)
    if capacity is not None:
        query = query.filter_by(capacity=capacity)
    if sort_price == 'asc':
        query = query.order_by(Room.price_per_night.asc())
    elif sort_price == 'desc':
        query = query.order_by(Room.price_per_night.desc())
    rooms = query.all()
    return jsonify([room.to_dict() for room in rooms])

@app.route('/api/rooms', methods=['POST'])
@admin_required
def add_room():
    if 'image' not in request.files:
        return jsonify({"error": "Không có file ảnh được gửi"}), 400
    image = request.files['image']
    if image.filename == '':
        return jsonify({"error": "Chưa chọn file ảnh"}), 400
    if not allowed_file(image.filename):
        return jsonify({"error": "Định dạng file không được hỗ trợ"}), 400
    hotel_id = request.form.get('hotel_id')
    room_number = request.form.get('room_number')
    room_type = request.form.get('room_type')
    price_per_night = request.form.get('price_per_night')
    capacity = request.form.get('capacity')
    description = request.form.get('description')
    if not all([hotel_id, room_number, room_type, price_per_night, capacity]):
        return jsonify({"error": "Vui lòng điền đầy đủ thông tin bắt buộc"}), 400
    hotel = Hotel.query.get(hotel_id)
    if not hotel:
        return jsonify({"error": "Khách sạn không tồn tại"}), 404
    existing_room = Room.query.filter_by(hotel_id=hotel_id, room_number=room_number).first()
    if existing_room:
        return jsonify({"error": "Số phòng đã tồn tại trong khách sạn này"}), 400
    filename = secure_filename(image.filename)
    image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    image.save(image_path)
    image_url = f"/static/images/{filename}"
    new_room = Room(
        hotel_id=hotel_id, room_number=room_number, room_type=room_type,
        price_per_night=float(price_per_night), capacity=int(capacity),
        description=description, image_url=image_url
    )
    db.session.add(new_room)
    db.session.commit()
    return jsonify({"message": "Thêm phòng thành công", "room": new_room.to_dict()}), 201

@app.route('/api/rooms/<int:room_id>', methods=['DELETE'])
@admin_required
def delete_room(room_id):
    room = Room.query.get(room_id)
    if not room:
        return jsonify({"error": "Phòng không tồn tại"}), 404
    current_date = datetime.now()
    active_bookings = Booking.query.filter(
        Booking.room_id == room_id,
        Booking.check_in_date <= current_date,
        Booking.check_out_date >= current_date
    ).all()
    if active_bookings:
        return jsonify({"error": "Không thể xóa phòng vì đang có lịch đặt còn hiệu lực"}), 400
    if room.image_url and os.path.exists(os.path.join(app.static_folder, room.image_url.lstrip('/'))):
        os.remove(os.path.join(app.static_folder, room.image_url.lstrip('/')))
    db.session.delete(room)
    db.session.commit()
    return jsonify({"message": "Xóa phòng thành công"}), 200

@app.route('/api/rooms/<int:room_id>', methods=['PUT'])
@admin_required
def update_room(room_id):
    room = Room.query.get(room_id)
    if not room:
        return jsonify({"error": "Phòng không tồn tại"}), 404
    current_date = datetime.now()
    active_bookings = Booking.query.filter(
        Booking.room_id == room_id,
        Booking.check_in_date <= current_date,
        Booking.check_out_date >= current_date
    ).all()
    if active_bookings:
        return jsonify({"error": "Không thể sửa phòng vì đang có lịch đặt còn hiệu lực"}), 400
    data = request.form
    hotel_id = data.get('hotel_id', room.hotel_id)
    room_number = data.get('room_number', room.room_number)
    room_type = data.get('room_type', room.room_type)
    price_per_night = data.get('price_per_night', room.price_per_night)
    capacity = data.get('capacity', room.capacity)
    description = data.get('description', room.description)
    if not all([hotel_id, room_number, room_type, price_per_night, capacity]):
        return jsonify({"error": "Vui lòng điền đầy đủ thông tin bắt buộc"}), 400
    hotel = Hotel.query.get(hotel_id)
    if not hotel:
        return jsonify({"error": "Khách sạn không tồn tại"}), 404
    existing_room = Room.query.filter_by(hotel_id=hotel_id, room_number=room_number).first()
    if existing_room and existing_room.id != room_id:
        return jsonify({"error": "Số phòng đã tồn tại trong khách sạn này"}), 400
    if 'image' in request.files and request.files['image'].filename != '':
        image = request.files['image']
        if not allowed_file(image.filename):
            return jsonify({"error": "Định dạng file không được hỗ trợ"}), 400
        filename = secure_filename(image.filename)
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        image.save(image_path)
        if room.image_url and os.path.exists(os.path.join(app.static_folder, room.image_url.lstrip('/'))):
            os.remove(os.path.join(app.static_folder, room.image_url.lstrip('/')))
        room.image_url = f"/static/images/{filename}"
    room.hotel_id = hotel_id
    room.room_number = room_number
    room.room_type = room_type
    room.price_per_night = float(price_per_night)
    room.capacity = int(capacity)
    room.description = description
    db.session.commit()
    return jsonify({"message": "Cập nhật phòng thành công", "room": room.to_dict()}), 200

@app.route('/api/bookings', methods=['POST'])
@login_required
def create_booking():
    data = request.json
    try:
        room_id = int(data.get('room_id'))
        guest_name = data.get('guest_name')
        guest_email = data.get('guest_email')
        check_in = datetime.strptime(data.get('check_in'), '%Y-%m-%d')
        check_out = datetime.strptime(data.get('check_out'), '%Y-%m-%d')
    except (ValueError, TypeError):
        return jsonify({"error": "Định dạng dữ liệu không hợp lệ"}), 400
    if not all([room_id, guest_name, guest_email, check_in, check_out]):
        return jsonify({"error": "Vui lòng điền đầy đủ thông tin"}), 400
    if check_in >= check_out:
        return jsonify({"error": "Ngày nhận phòng phải trước ngày trả phòng"}), 400
    room = Room.query.get_or_404(room_id)
    existing_bookings = Booking.query.filter_by(room_id=room_id).all()
    for booking in existing_bookings:
        if (check_in < booking.check_out_date and check_out > booking.check_in_date):
            return jsonify({"error": "Phòng đã được đặt trong khoảng thời gian này"}), 400
    new_booking = Booking(
        room_id=room_id, guest_name=guest_name, guest_email=guest_email,
        check_in_date=check_in, check_out_date=check_out
    )
    db.session.add(new_booking)
    db.session.commit()
    return jsonify({"message": "Đặt phòng thành công", "booking": new_booking.to_dict()}), 201

@app.route('/api/bookings', methods=['GET'])
@login_required
def get_bookings():
    bookings = Booking.query.all()
    return jsonify([booking.to_dict() for booking in bookings])

@app.route('/api/bookings/<int:booking_id>', methods=['DELETE'])
@admin_required
def delete_booking(booking_id):
    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({"error": "Đặt phòng không tồn tại"}), 404
    db.session.delete(booking)
    db.session.commit()
    return jsonify({"message": "Xóa đặt phòng thành công"}), 200

@app.route('/api/bookings/<int:booking_id>', methods=['PUT'])
@admin_required
def update_booking(booking_id):
    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({"error": "Đặt phòng không tồn tại"}), 404
    data = request.json
    try:
        guest_name = data.get('guest_name', booking.guest_name)
        guest_email = data.get('guest_email', booking.guest_email)
        check_in = datetime.strptime(data.get('check_in'), '%Y-%m-%d')
        check_out = datetime.strptime(data.get('check_out'), '%Y-%m-%d')
    except (ValueError, TypeError):
        return jsonify({"error": "Định dạng ngày không hợp lệ"}), 400
    if not all([guest_name, guest_email, check_in, check_out]):
        return jsonify({"error": "Vui lòng điền đầy đủ thông tin"}), 400
    if check_in >= check_out:
        return jsonify({"error": "Ngày nhận phòng phải trước ngày trả phòng"}), 400
    existing_bookings = Booking.query.filter(Booking.room_id == booking.room_id, Booking.id != booking_id).all()
    for existing in existing_bookings:
        if (check_in < existing.check_out_date and check_out > existing.check_in_date):
            return jsonify({"error": "Phòng đã được đặt trong khoảng thời gian này"}), 400
    booking.guest_name = guest_name
    booking.guest_email = guest_email
    booking.check_in_date = check_in
    booking.check_out_date = check_out
    db.session.commit()
    return jsonify({"message": "Cập nhật đặt phòng thành công", "booking": booking.to_dict()}), 200

@app.route('/api/users', methods=['GET'])
@admin_required
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@app.route('/api/users', methods=['POST'])
@admin_required
def add_user():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'user')  # Mặc định là 'user' nếu không chỉ định
    if not username or not password:
        return jsonify({"error": "Vui lòng cung cấp tên đăng nhập và mật khẩu"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Tên đăng nhập đã tồn tại"}), 400
    new_user = User(username=username, password=password, role=role)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "Thêm tài khoản thành công", "user": new_user.to_dict()}), 201

@app.route('/api/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Tài khoản không tồn tại"}), 404
    data = request.json
    username = data.get('username', user.username)
    password = data.get('password', user.password)
    role = data.get('role', user.role)
    if not username or not password:
        return jsonify({"error": "Vui lòng cung cấp tên đăng nhập và mật khẩu"}), 400
    existing_user = User.query.filter_by(username=username).first()
    if existing_user and existing_user.id != user_id:
        return jsonify({"error": "Tên đăng nhập đã tồn tại"}), 400
    user.username = username
    user.password = password
    user.role = role
    db.session.commit()
    return jsonify({"message": "Cập nhật tài khoản thành công", "user": user.to_dict()}), 200

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Tài khoản không tồn tại"}), 404
    if user.role == 'admin' and user.username == 'admin':
        return jsonify({"error": "Không thể xóa tài khoản admin mặc định"}), 403
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "Xóa tài khoản thành công"}), 200

if __name__ == '__main__':
    with app.app_context():
        create_tables()
    if not os.path.exists(app.static_folder):
        os.makedirs(app.static_folder)
    app.run(debug=True, port=5000)