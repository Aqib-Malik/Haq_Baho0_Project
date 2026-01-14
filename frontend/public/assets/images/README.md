# Logo Placement Instructions

## Where to Place Your Logo

1. Save your logo image file as `logo.jpeg` in this directory: `frontend/public/assets/images/`

2. The logo file path should be: `frontend/public/assets/images/logo.jpeg`

3. Supported formats: PNG, JPG, JPEG, SVG (JPEG/JPG recommended)

4. Recommended size: 
   - Minimum: 200x200 pixels
   - Recommended: 400x400 pixels or larger
   - Aspect ratio: Square (1:1) works best, but the layout will adapt

5. After placing the logo, the application will automatically display it in the header.

## Logo Display

The logo appears in the application header along with the company name "Haq Bahoo Mian & Company". The header uses the brand colors from your logo:
- Deep Royal Blue (#1e3a8a)
- Golden Yellow accents (#fbbf24)

## Note

If you need to use a different filename or format, you'll need to update the path in:
- `frontend/src/app/components/layout/layout.component.html`
- Change the `src` attribute of the `<img>` tag from `/assets/images/logo.jpeg` to your file path
