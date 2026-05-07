# Stack Overflow Clone

A production-ready MERN Stack Overflow clone with authentication, questions, answers, social posting, multi-language support, OTP verification, subscriptions, login history, reward points, and deployment-ready configuration.

## Live Demo

Frontend: https://stack-kappa-one.vercel.app  
Backend: https://stack-overflow-backend-1aof.onrender.com

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Radix UI
- Lucide React
- Axios
- React Toastify
- i18next
- react-i18next

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JSON Web Token
- bcryptjs
- Nodemailer
- Twilio
- Multer
- Razorpay
- ua-parser-js

### Database

- MongoDB Atlas

### Deployment

- Vercel for frontend
- Render for backend
- GitHub for version control

## Core Features

### Authentication

- User signup and login
- JWT authentication
- Forgot password using registered email or phone
- New generated password sent through email
- Password hashing with bcrypt
- One forgot-password request per user per day

### Login Security

- Login history tracking
- Browser detection
- Operating system detection
- Device detection
- IP address tracking
- Chrome login requires email OTP
- Microsoft Edge login works without extra OTP
- Mobile login allowed only between 10:00 AM and 1:00 PM IST

### Questions And Answers

- Ask questions
- View questions
- Answer questions
- Upvote and downvote questions
- Delete own questions and answers
- Subscription-based question posting limits

### Reward Points System

- User earns 5 points for posting an answer
- User earns 5 bonus points when an answer reaches 5 upvotes
- Bonus points are awarded only once per answer
- Downvotes deduct points fairly
- Deleted answers deduct earned points
- Points do not go below zero
- Points history on profile
- Points transfer between users
- Transfer allowed only if sender has more than 10 points

### Public Social Space

- Public social feed
- Text posts
- Photo and video upload
- Like posts
- Comment on posts
- Share posts
- Friend requests
- Accept friend request
- Reject friend request
- Remove friend
- Friend-based daily posting limits

### Multi-Language Support

Supported languages:

- English
- Spanish
- Hindi
- Portuguese
- Chinese
- French

Language switching requires OTP verification:

- French sends OTP to registered email
- Other languages send OTP to registered mobile number
- Selected language preference is saved in MongoDB

### Subscription And Payments

- Razorpay payment integration
- Subscription plans
- Plan-based daily question limits

## Environment Variables

### Backend `.env`

```env
PORT=10000
MONGODB_URL=your_mongodb_url
JWT_SECRET=your_jwt_secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email
SMTP_PASS=your_email_app_password
SMTP_FROM=Stack Overflow Clone <your_email>

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
DEFAULT_SMS_COUNTRY_CODE=+91

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

LOGIN_OTP_EXPIRY_MINUTES=5
LANGUAGE_OTP_EXPIRY_MINUTES=5
LOGIN_HISTORY_LIMIT=50
POINTS_HISTORY_LIMIT=100
TRUST_PROXY=true
FORGOT_PASSWORD_DAY_OFFSET_MINUTES=330
SOCIAL_DAY_OFFSET_MINUTES=330
SOCIAL_UPLOAD_MAX_FILE_SIZE_MB=25
```

### Frontend `.env`

```env
NEXT_PUBLIC_BACKEND_URL=your_backend_url
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
```

## Installation

Clone the repository:

```bash
git clone https://github.com/vamshichethan/stack_overflow.git
cd stack_overflow
```

Install backend dependencies:

```bash
cd server
npm install
```

Install frontend dependencies:

```bash
cd ../stack
npm install
```

## Run Locally

Start backend:

```bash
cd server
npm run start
```

Start frontend:

```bash
cd stack
npm run dev
```

Frontend runs on:

```txt
http://localhost:3000
```

Backend runs on:

```txt
http://localhost:5001
```

## Deployment

### Backend On Render

Root directory:

```txt
server
```

Build command:

```bash
npm install
```

Start command:

```bash
node index.js
```

### Frontend On Vercel

Root directory:

```txt
stack
```

Build command:

```bash
npm run build
```

Add production environment variables in Vercel before deploying.

## Notes

- Passwords are never stored in plain text.
- OTP values are not exposed to the frontend.
- Protected actions use JWT authentication.
- Social media uploads currently use local backend storage.
- For permanent production media storage, use Cloudinary or another cloud storage provider.

## Author

Built by Vamshi.
