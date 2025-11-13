# LowLogic Deployment Guide

## 🚀 Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- Git

### One-Command Deployment
```bash
# Clone the repository
git clone <repository-url>
cd tracer

# Build and start all services
docker-compose up --build

# Access LowLogic at http://localhost
```

### Docker Commands
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild services
docker-compose up --build
```

---

## 🖥️ Local Development Deployment

### Backend Setup
```bash
cd tracer/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start server
python main.py
```

### Frontend Setup
```bash
cd tracer/frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:3000
```

---

## ☁️ Cloud Deployment Options

### 1. Heroku
```bash
# Backend (Procfile)
web: python main.py

# Frontend build and deploy to Heroku static sites
```

### 2. Railway
```bash
# Deploy with docker-compose.yml
# Connect GitHub repository
# Railway auto-detects Docker configuration
```

### 3. Vercel (Frontend) + Render (Backend)
```bash
# Frontend: Deploy to Vercel
# Backend: Deploy to Render with Docker
# Update WebSocket URL in frontend config
```

### 4. AWS/Azure/GCP
```bash
# Use docker-compose.yml
# Deploy to container services
# Configure load balancer and networking
```

---

## 🔧 Configuration

### Environment Variables
```bash
# Backend
PORT=8765
HOST=0.0.0.0

# Frontend
VITE_API_URL=ws://localhost:8765
```

### Production Configuration
```nginx
# nginx.conf already configured for production
# Includes security headers, gzip compression
# WebSocket proxy configuration
```

---

## 📊 Monitoring

### Health Checks
```bash
# Backend health
curl http://localhost:8765/health

# Frontend availability
curl http://localhost
```

### Docker Monitoring
```bash
# Container status
docker-compose ps

# Resource usage
docker stats

# Logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## 🛠️ Troubleshooting

### Common Issues
1. **Port conflicts**: Change ports in docker-compose.yml
2. **Backend dependencies**: Ensure Python packages are installed
3. **Frontend build**: Clear node_modules and reinstall
4. **WebSocket issues**: Check proxy configuration in nginx.conf

### Debug Commands
```bash
# Backend logs
docker-compose logs backend

# Frontend logs
docker-compose logs frontend

# Rebuild specific service
docker-compose up --build backend
```

---

## 🔒 Security Considerations

- WebSocket connections are proxied through nginx
- Security headers included in nginx configuration
- CORS properly configured for WebSocket connections
- No sensitive data in client-side code

For production, consider:
- HTTPS/SSL certificates
- Rate limiting
- Authentication system
- Input validation