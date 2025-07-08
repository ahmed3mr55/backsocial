# Social Media Platform

> A full‑featured social networking site built with Next.js, Tailwind CSS, Express.js, MongoDB and Socket.io.

## 🛠️ Tech Stack

* **Frontend:** Next.js, Tailwind CSS
* **Backend:** Express.js, Socket.io
* **Database:** MongoDB (Mongoose)
* **Media Storage:** Cloudinary
* **Authentication & Security:** JWT, HTTP‑Only Cookies, Two‑Factor (2FA)
* **Real‑Time:** Socket.io for live notifications

---

## 🚀 Overview

Our Social Media Platform lets you post text updates, like/unlike posts, comment and reply in threads, follow other users (with private‑account support), track profile visitors, and receive real‑time notifications for likes, comments, follows, profile visits, and more—all within a sleek, mobile‑friendly interface.

---

## 🔑 Features

* **Post Creation & Engagement**
  Create posts, like or unlike them, view like and comment counts.

* **Nested Comments & Replies**
  Add comments and threaded replies, show/hide replies with “load more.”

* **User Profiles**
  View any user’s profile showing bio, location, relationship status, personal links and profile picture.

* **Privacy Controls & Follow Requests**
  Switch to a private account—new followers require your approval; approve or reject incoming requests.

* **Profile Visitor Tracking**
  See who’s viewed your profile when you enable visitor history.

* **Real‑Time Notifications**
  Instant in‑app alerts (via Socket.io) for new followers, likes, comments, replies, profile visits, and more.

* **Two‑Factor Authentication (2FA)**
  Add extra security by requiring a one‑time code during login.

* **Logout Everywhere**
  Invalidate all active sessions from your account settings.

* **Cloudinary Image Optimization**
  Upload and serve optimized profile images and post media.

---

## ⚙️ Installation & Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/ahmed3mr55/backsocial.git
   cd back
   ```

2. **Install dependencies**

   ```bash
   npm install       # or yarn install
   ```

3. **Environment Variables**
   Create a `.env` file in the project root with these keys (do **not** include actual values):

   ```env
   MONGODB_URI=
   SECRET_KEY=
   NODE_ENV=
   CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=
   EMAIL=
   EMAIL_PASSWORD=
   FRONT_URL=
   ```

4. **Run Backend (Express)**

   ```bash
   npm run start    # starts Express.js API
   ```


---

## 🤝 Contributing

Contributions are welcome! Please open issues or submit pull requests to help improve the platform.

---

## 🔒 License

This project is licensed under the MIT License.
