# Cloudinary Setup Guide for Ji Sushi

Your Cloudinary account is already set up! Here's how to upload and use menu images.

## Your Credentials
- Cloud name: `dlt6bojfp`
- Already configured in your project via environment variable

## How to Upload Images

### Option 1: Cloudinary Dashboard (Recommended)
1. Go to [cloudinary.com](https://cloudinary.com) and log in
2. Click "Media Library" in the top menu
3. Click "Upload" button
4. Drag and drop your food photos
5. Organize them into folders like:
   - `forretter/` - Appetizers
   - `sticks/` - Stick dishes
   - `sashimi/` - Sashimi
   - `maki/` - Maki rolls
   - `nigiri/` - Nigiri
   - etc.

### Option 2: Upload Widget
You can also use the Cloudinary Upload Widget integrated in your admin panel (if you create one).

## Image Naming Convention

Use descriptive names that match your menu items:
- `forretter/edamame` - Edamame beans
- `forretter/spring-rolls` - Spring rolls
- `sticks/laks-teriyaki` - Salmon teriyaki stick
- `maki/california-roll` - California roll
- etc.

## How Images Are Used in Code

In your menu, images are loaded like this:

```tsx
<CldImage
  src="forretter/edamame"  // Just use the folder/filename
  alt="Edamame bønner"
  fill
  className="object-cover"
  crop={{
    type: 'auto',
    source: true
  }}
/>
```

## Optimization Features

Cloudinary automatically:
- Converts images to optimal formats (WebP, AVIF)
- Resizes based on screen size
- Applies smart cropping
- Compresses for fast loading
- Serves via global CDN

## Free Tier Limits
- 25GB storage
- 25GB bandwidth per month
- Perfect for 10,000+ monthly visitors

## Tips for Best Results

1. **Image Size**: Upload high-quality photos (1200-2000px wide)
2. **Format**: JPG or PNG work great
3. **Naming**: Use lowercase and hyphens (no spaces)
4. **Organization**: Use folders to keep menu sections organized

Your menu is now ready to display beautiful food photos with automatic optimization!
