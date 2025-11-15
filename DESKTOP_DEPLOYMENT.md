# LowLogic Desktop App Deployment

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Python 3.8+
- Electron (installed via npm)

### Installation & Development

```bash
# Navigate to frontend directory
cd tracer/frontend

# Install dependencies
npm install

# Install additional Electron dependencies
npm install electron electron-builder concurrently wait-on

# Start development with Electron
npm run electron:dev
```

### Building for Distribution

```bash
# Build Electron app
npm run electron:pack

# Create distributable
npm run electron:dist
```

## 📱 Desktop Features

### **Native Menu Integration**
- **File Menu**: New, Open, Save, Save As, Export C++
- **Edit Menu**: Undo, Redo, Cut, Copy, Paste, Select All
- **Run Menu**: Run, Step, Continue, Stop, Reset
- **View Menu**: Reload, DevTools, Zoom controls
- **Help Menu**: About, Documentation

### **Keyboard Shortcuts**
- `Ctrl+N`: New file
- `Ctrl+O`: Open file
- `Ctrl+S`: Save file
- `Ctrl+Shift+S`: Save as
- `Ctrl+E`: Export to C++
- `F5`: Run/Continue
- `F10`: Step over
- `Shift+F5`: Stop
- `Ctrl+Shift+F5`: Reset

### **Desktop-Only Features**
- **Integrated Python Backend**: No separate server needed
- **Native File Operations**: Open/Save with system dialogs
- **Local C++ Export**: Save generated code directly
- **Offline Mode**: Works without internet connection
- **Native Window Controls**: Resizable, minimizable, maximizable

## 🏗️ Architecture

### **Electron Main Process**
- Manages native window and menu
- Starts Python backend subprocess
- Handles file operations and IPC

### **Python Backend**
- Runs as subprocess within Electron app
- Provides LowLogic language processing
- Communicates via IPC instead of WebSocket

### **React Frontend**
- Same UI as web version
- Desktop-specific optimizations
- Native menu integration

## 📦 Distribution

### **Outputs**
- **Windows**: `.exe` installer (NSIS)
- **macOS**: `.dmg` disk image
- **Linux**: `.AppImage` portable app

### **Build Configuration**
- Single executable distribution
- Includes Python runtime and dependencies
- No external dependencies required
- Approximately 50-100MB download size

## 🔧 Development

### **Project Structure**
```
frontend/
├── public/
│   ├── electron.js      # Electron main process
│   ├── preload.js        # Security bridge
│   └── icon.png          # App icon
├── src/
│   ├── DesktopApp.tsx    # Desktop React app
│   ├── hooks/
│   │   └── useDesktopApp.ts
│   └── services/
│       └── desktop-websocket.ts
├── package.json          # Electron build config
└── dist-electron/        # Build output
```

### **Development Workflow**
1. Start Python backend automatically
2. Launch React development server
3. Electron loads local React app
4. Hot reload works for frontend changes
5. Backend changes require restart

## 🚀 Production Deployment

### **Step 1: Build Frontend**
```bash
npm run build
```

### **Step 2: Package Electron App**
```bash
npm run electron:dist
```

### **Step 3: Distribute**
- Upload built artifacts to distribution platform
- Create installer packages
- Provide download links

### **Platform-Specific Builds**
```bash
# Windows
npm run electron:dist -- --win

# macOS
npm run electron:dist -- --mac

# Linux
npm run electron:dist -- --linux
```

## 🔍 Troubleshooting

### **Common Issues**
1. **Python backend not starting**: Check Python installation
2. **Window not showing**: Check Electron console for errors
3. **Build failures**: Ensure all dependencies installed
4. **Menu not working**: Verify preload script is loaded

### **Debug Tools**
- **DevTools**: F12 or View → Toggle Developer Tools
- **Process Monitor**: Check if Python subprocess is running
- **Console Logs**: View both Electron and React console output

### **Platform Issues**
- **Windows**: May need Visual Studio Build Tools
- **macOS**: Code signing required for distribution
- **Linux**: Ensure system libraries are available

## 📋 Requirements Checklist

- [ ] Node.js 16+ installed
- [ ] Python 3.8+ installed
- [ ] All npm dependencies installed
- [ ] Electron builds successfully
- [ ] Python backend starts correctly
- [ ] File operations work
- [ ] Menu shortcuts functional
- [ ] C++ export saves correctly
- [ ] App runs offline

The LowLogic desktop app provides a complete, self-contained solution for low-level programming education and research.