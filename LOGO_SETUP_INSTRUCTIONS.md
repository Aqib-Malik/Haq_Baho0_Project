# Logo Setup Instructions

## ✅ What Has Been Done

1. **Created Layout Component** - A new layout component with header has been created at `frontend/src/app/components/layout/`
2. **Updated App Title** - Changed to "Haq Bahoo Mian & Company" in:
   - Browser title (index.html)
   - Layout component
3. **Updated Color Scheme** - Changed to match your logo:
   - **Primary Blue**: #1e3a8a (Deep Royal Blue)
   - **Secondary Blue**: #1e40af (Darker Blue)  
   - **Accent Gold**: #fbbf24 (Golden Yellow/Amber)
   - **Grey/Silver**: #6b7280 (Slate Grey)
   - **Background**: White (#ffffff)
4. **Created Assets Folder** - Created `frontend/public/assets/images/` for your logo
5. **Updated Routing** - Integrated layout component into app routing

## 📋 What You Need to Do

### Step 1: Place Your Logo

1. **Save your logo file** as `logo.jpeg` in this location:
   ```
   frontend/public/assets/images/logo.jpeg
   ```

2. **File requirements:**
   - Format: JPEG/JPG (recommended), PNG, or SVG
   - Size: Minimum 200x200px, Recommended 400x400px or larger
   - Aspect ratio: Square (1:1) works best, but the layout will adapt

### Step 2: Verify Logo Display

After placing the logo file, restart your development server if it's running:

```bash
cd frontend
npm start
```

The logo should appear in the header of your application.

## 🎨 Color Scheme Applied

The following colors from your logo have been applied throughout the application:

- **Primary Blue (#1e3a8a)**: Used for headers, buttons, links, and primary UI elements
- **Secondary Blue (#1e40af)**: Used for gradients and hover states
- **Golden Yellow (#fbbf24)**: Used for accents and highlights (header border)
- **Slate Grey (#6b7280)**: Used for secondary text and icons
- **White (#ffffff)**: Used for backgrounds and cards

## 📁 File Locations

- **Logo file**: `frontend/public/assets/images/logo.jpeg`
- **Layout component**: `frontend/src/app/components/layout/`
- **App title**: Updated in `frontend/src/index.html` and layout component
- **Color scheme**: Updated in `frontend/src/styles.css` and component CSS files

## 🔍 If Logo Doesn't Appear

1. Check that the file is named exactly `logo.jpeg`
2. Verify the file is in `frontend/public/assets/images/` directory
3. Check browser console for any 404 errors
4. Try hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
5. If using a different filename, update the path in:
   `frontend/src/app/components/layout/layout.component.html`
   - The current path is `/assets/images/logo.jpeg`

## 📝 Notes

- The logo appears in the header on all pages
- The header is sticky and stays at the top when scrolling
- The layout is responsive and adapts to different screen sizes
- All colors have been updated to match your brand colors from the logo
