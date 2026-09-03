/**
 * Ray-Ban Meta Spin View Converter
 * Pure Vanilla JavaScript - 100% Client-Side Engine
 * Re-encodes photos to 3024 x 4032 (3:4) and injects Meta AI smart-glasses EXIF.
 * Zero-dependency, bundler-free, static-host ready (GitHub Pages, Netlify, Vercel, Apache, Nginx).
 */

// Centralized SEO, Analytics & Monetization Config (Self-contained)
const SEO_CONFIG = {
  siteName: 'metaspin',
  brandName: 'metaspin',
  domain: 'metaspin.zplaybox.in',
  canonicalUrl: 'https://metaspin.zplaybox.in/',
  defaultTitle: 'MetaSpin – Instagram 3D Spin View Photo Converter (3024×4032)',
  defaultDescription: 'Free online MetaSpin photo converter. Convert photos to exact 3024×4032 resolution with smart glasses EXIF metadata for Instagram Story 3D spin view.',
  analytics: {
    measurementId: '',
    isEnabled: false,
  },
  adsense: {
    clientId: '',
    isEnabled: false,
  },
};

function initAnalytics() {
  if (typeof window === 'undefined') return;
  if (!SEO_CONFIG.analytics.isEnabled || !SEO_CONFIG.analytics.measurementId) return;
  const gaId = SEO_CONFIG.analytics.measurementId;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', gaId, { anonymize_ip: true, send_page_view: true });
  window.gtag = gtag;
}

function trackEvent(eventName, params = {}) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}

function initAdSense() {
  if (typeof window === 'undefined') return;
  if (!SEO_CONFIG.adsense.isEnabled || !SEO_CONFIG.adsense.clientId) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(SEO_CONFIG.adsense.clientId)}`;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}

// Application State
const appState = {
  currentBlob: null,
  currentObjectUrl: null,
  currentFilename: 'metaspin-photo.jpg',
};

// UI Notification / Error Helper
function showUiError(message) {
  let errorBanner = document.getElementById('conversion-error-banner');
  if (!errorBanner) {
    errorBanner = document.createElement('div');
    errorBanner.id = 'conversion-error-banner';
    errorBanner.className = 'error-banner';
    const uploadCard = document.getElementById('upload-card');
    if (uploadCard) {
      uploadCard.insertBefore(errorBanner, uploadCard.firstChild);
    }
  }
  errorBanner.textContent = message;
  errorBanner.classList.remove('hidden');
  errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearUiError() {
  const errorBanner = document.getElementById('conversion-error-banner');
  if (errorBanner) {
    errorBanner.classList.add('hidden');
    errorBanner.textContent = '';
  }
}

function showUiSuccess(message) {
  let toast = document.getElementById('action-success-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'action-success-toast';
    toast.className = 'success-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// ==========================================================================
// Top Bar Scroll Shadow & Navigation
// ==========================================================================
function initHeaderScroll() {
  const header = document.querySelector('.top-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 4) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

// ==========================================================================
// Mobile Slide-in Drawer Controller
// ==========================================================================
function initMobileDrawer() {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const drawer = document.getElementById('mobile-drawer');
  const scrim = document.getElementById('drawer-scrim');
  const closeBtn = document.getElementById('drawer-close-btn');
  const drawerLinks = document.querySelectorAll('.drawer-nav-link, .drawer-cta a');

  function openDrawer() {
    drawer?.classList.add('open');
    scrim?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer?.classList.remove('open');
    scrim?.classList.remove('open');
    document.body.style.overflow = '';
  }

  hamburgerBtn?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  scrim?.addEventListener('click', closeDrawer);

  drawerLinks.forEach((link) => {
    link.addEventListener('click', closeDrawer);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer?.classList.contains('open')) {
      closeDrawer();
    }
  });
}

// ==========================================================================
// Binary EXIF Orientation Parser
// Reads JPEG APP1 segment directly to determine true orientation (tags 1..8)
// ==========================================================================
function getOrientationFromBuffer(arrayBuffer) {
  try {
    const view = new DataView(arrayBuffer);
    if (view.getUint16(0, false) !== 0xFFD8) {
      return 1; // Not standard JPEG
    }

    const length = view.byteLength;
    let offset = 2;

    while (offset < length) {
      const marker = view.getUint16(offset, false);

      // APP1 marker (0xFFE1)
      if (marker === 0xFFE1) {
        const markerLength = view.getUint16(offset + 2, false);
        // Look for "Exif\0\0"
        if (view.getUint32(offset + 4, false) === 0x45786966 && view.getUint16(offset + 8, false) === 0x0000) {
          const tiffStart = offset + 10;
          const endianness = view.getUint16(tiffStart, false);
          const isLittle = endianness === 0x4949;

          const ifdOffset = view.getUint32(tiffStart + 4, isLittle);
          const numEntries = view.getUint16(tiffStart + ifdOffset, isLittle);

          for (let i = 0; i < numEntries; i++) {
            const entryOffset = tiffStart + ifdOffset + 2 + (i * 12);
            if (entryOffset + 12 > length) break;
            const tag = view.getUint16(entryOffset, isLittle);
            if (tag === 0x0112) { // Orientation tag
              const orientation = view.getUint16(entryOffset + 8, isLittle);
              if (orientation >= 1 && orientation <= 8) {
                return orientation;
              }
            }
          }
        }
        offset += 2 + markerLength;
      } else if ((marker & 0xFF00) === 0xFF00) {
        if (marker === 0xFFDA || marker === 0xFFD9) break;
        const markerLength = view.getUint16(offset + 2, false);
        offset += 2 + markerLength;
      } else {
        offset += 1;
      }
    }
  } catch (e) {
    console.warn('Could not parse binary EXIF orientation:', e);
  }
  return 1;
}

// ==========================================================================
// Orientation-Normalized Upright Canvas
// Pre-rotates source image so rotated phone shots stand upright before cropping
// ==========================================================================
function createUprightCanvas(img, orientation) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement('canvas');

  // Orientations 5, 6, 7, 8 swap width & height
  if (orientation >= 5 && orientation <= 8) {
    canvas.width = h;
    canvas.height = w;
  } else {
    canvas.width = w;
    canvas.height = h;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return img;

  switch (orientation) {
    case 2: // Horizontal flip
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      break;
    case 3: // 180° rotate
      ctx.translate(w, h);
      ctx.rotate(Math.PI);
      break;
    case 4: // Vertical flip
      ctx.translate(0, h);
      ctx.scale(1, -1);
      break;
    case 5: // Transpose
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6: // 90° rotate CW
      ctx.translate(h, 0);
      ctx.rotate(0.5 * Math.PI);
      break;
    case 7: // Transverse
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(w, -h);
      ctx.scale(-1, 1);
      break;
    case 8: // 270° rotate CW (90° CCW)
      ctx.translate(0, w);
      ctx.rotate(-0.5 * Math.PI);
      break;
    default:
      break;
  }

  ctx.drawImage(img, 0, 0);
  return canvas;
}

// ==========================================================================
// Date Formatter for EXIF ("YYYY:MM:DD HH:MM:SS")
// ==========================================================================
function getExifDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ==========================================================================
// Data URL to Blob Converter
// ==========================================================================
function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// ==========================================================================
// Ray-Ban Meta Conversion & EXIF Injection Engine
// ==========================================================================
async function processImageFile(file) {
  if (!file) return;
  clearUiError();

  // Validate format broadly (allow any image mime type or standard image file extension)
  const isImageMime = !file.type || file.type.startsWith('image/');
  const hasImageExt = /\.(jpe?g|png|webp|heic|heif|bmp|gif|tiff?)$/i.test(file.name || '');
  if (!isImageMime && !hasImageExt) {
    showUiError('Please upload a valid photo (JPEG, PNG, WEBP, or HEIC).');
    return;
  }

  const uploadCard = document.getElementById('upload-card');
  const processingCard = document.getElementById('processing-card');
  const resultCard = document.getElementById('result-card');

  trackEvent('image_selected', { fileType: file.type || 'unknown', fileSize: file.size });
  trackEvent('conversion_started');

  uploadCard?.classList.add('hidden');
  resultCard?.classList.add('hidden');
  processingCard?.classList.remove('hidden');

  try {
    let processableFile = file;

    // Check if file is HEIC/HEIF and try converting with client-side heic2any if available
    const isHeic = (file.type && /heic|heif/i.test(file.type)) || /\.(heic|heif)$/i.test(file.name || '');
    if (isHeic && typeof window.heic2any === 'function') {
      try {
        const convertedBlob = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 });
        const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        processableFile = new File([finalBlob], (file.name || 'photo').replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
      } catch (heicErr) {
        console.warn('heic2any conversion fallback:', heicErr);
      }
    }

    // 1. Read binary for EXIF Orientation
    const arrayBuffer = await processableFile.arrayBuffer();
    const orientation = getOrientationFromBuffer(arrayBuffer);

    // 2. Decode raw image
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(processableFile);
    });

    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => {
        if (isHeic) {
          reject(new Error('Your device saved this photo in HEIC format. Please convert it to JPG or take a photo directly using the "Take Photo" button.'));
        } else {
          reject(new Error('Failed to decode image data. Please ensure the file is a valid, uncorrupted photo.'));
        }
      };
      img.src = dataUrl;
    });

    // 3. Pre-rotate upright if needed
    const uprightSource = createUprightCanvas(img, orientation);
    const srcW = uprightSource.width;
    const srcH = uprightSource.height;

    // 4. Target 3024 × 4032 (3:4 portrait) cover-crop calculation
    const targetW = 3024;
    const targetH = 4032;
    const targetAspect = targetW / targetH; // 0.75
    const srcAspect = srcW / srcH;

    let cropX = 0;
    let cropY = 0;
    let cropW = srcW;
    let cropH = srcH;

    if (srcAspect > targetAspect) {
      // Source is wider than 3:4 -> fit height, center-crop width overflow
      cropW = srcH * targetAspect;
      cropX = (srcW - cropW) / 2;
    } else {
      // Source is taller than 3:4 -> fit width, center-crop height overflow
      cropH = srcW / targetAspect;
      cropY = (srcH - cropH) / 2;
    }

    // 5. Draw onto off-screen 3024 × 4032 canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = targetW;
    exportCanvas.height = targetH;
    const ctx = exportCanvas.getContext('2d', { colorSpace: 'srgb' });

    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(uprightSource, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
    }

    // 6. Export to standard JPEG Blob (quality 0.92)
    const rawJpegBlob = await new Promise((resolve, reject) => {
      exportCanvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas JPEG encoding failed.'));
      }, 'image/jpeg', 0.92);
    });

    // 7. Inject Ray-Ban Meta Smart Glasses EXIF Signature
    const rawDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(rawJpegBlob);
    });

    let finalBlob = rawJpegBlob;
    const piexifObj = window.piexif || (typeof piexif !== 'undefined' ? piexif : null);

    if (piexifObj) {
      const now = new Date();
      const dtStr = getExifDate(now);

      // Build pristine Ray-Ban Meta smart-glasses EXIF dictionary
      const zeroth = {};
      const exif = {};
      const gps = {}; // Explicitly empty: NO GPS data
      const interop = {};
      const first = {};

      // 0th IFD: Hardware signature
      zeroth[piexifObj.ImageIFD.Make] = "Meta AI";
      zeroth[piexifObj.ImageIFD.Model] = "Ray-Ban Meta Smart Glasses 2";
      zeroth[piexifObj.ImageIFD.Orientation] = 1; // Standard upright
      zeroth[piexifObj.ImageIFD.XResolution] = [72, 1];
      zeroth[piexifObj.ImageIFD.YResolution] = [72, 1];
      zeroth[piexifObj.ImageIFD.ResolutionUnit] = 2; // Inches
      zeroth[piexifObj.ImageIFD.DateTime] = dtStr;

      // Exif IFD: Exact Ray-Ban sensor specs & sRGB colorspace (0xA001 = 1)
      exif[piexifObj.ExifIFD.ColorSpace] = 1; // 1 = sRGB
      exif[piexifObj.ExifIFD.PixelXDimension] = 3024;
      exif[piexifObj.ExifIFD.PixelYDimension] = 4032;
      exif[piexifObj.ExifIFD.ExifVersion] = "0231";
      exif[piexifObj.ExifIFD.DateTimeOriginal] = dtStr;
      exif[piexifObj.ExifIFD.DateTimeDigitized] = dtStr;

      const exifDict = {
        "0th": zeroth,
        "Exif": exif,
        "GPS": gps,
        "Interop": interop,
        "1st": first
      };

      try {
        const exifBytes = piexifObj.dump(exifDict);
        const injectedDataUrl = piexifObj.insert(exifBytes, rawDataUrl);
        finalBlob = dataURLtoBlob(injectedDataUrl);
      } catch (exifError) {
        console.warn('EXIF injection fallback:', exifError);
        finalBlob = rawJpegBlob;
      }
    } else {
      console.warn('piexif is not loaded, exporting without EXIF metadata');
    }

    // 8. Update Result Panel
    if (appState.currentObjectUrl) {
      URL.revokeObjectURL(appState.currentObjectUrl);
    }
    appState.currentBlob = finalBlob;
    appState.currentObjectUrl = URL.createObjectURL(finalBlob);

    const nowPad = (n) => String(n).padStart(2, '0');
    const d = new Date();
    appState.currentFilename = `metaspin-${d.getFullYear()}${nowPad(d.getMonth() + 1)}${nowPad(d.getDate())}-${nowPad(d.getHours())}${nowPad(d.getMinutes())}${nowPad(d.getSeconds())}.jpg`;

    const previewImg = document.getElementById('result-preview-img');
    const downloadLink = document.getElementById('download-btn');

    if (previewImg) {
      previewImg.src = appState.currentObjectUrl;
    }
    if (downloadLink) {
      downloadLink.href = appState.currentObjectUrl;
      downloadLink.download = appState.currentFilename;
    }

    // UI state transition to Result
    processingCard?.classList.add('hidden');
    resultCard?.classList.remove('hidden');

    trackEvent('conversion_completed', {
      targetResolution: `${targetW}x${targetH}`,
      exifMake: 'Meta AI',
      exifModel: 'Ray-Ban Meta Smart Glasses 2'
    });

    // Scroll smoothly to result
    resultCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    console.error('Error during image conversion:', err);
    showUiError(err.message || 'Could not convert image. Please check the file and try again.');
    processingCard?.classList.add('hidden');
    uploadCard?.classList.remove('hidden');
  } finally {
    // Reset file input values so user can upload the same file again if desired
    const inputLib = document.getElementById('file-input-library');
    const inputCam = document.getElementById('file-input-camera');
    if (inputLib) inputLib.value = '';
    if (inputCam) inputCam.value = '';
  }
}

// ==========================================================================
// Instagram Story Modal & Sharing System
// ==========================================================================
function openInstagramModal() {
  const modal = document.getElementById('insta-share-modal');
  if (!modal) return;

  // Sync converted download file to modal save button
  const saveBtn = document.getElementById('insta-modal-save-btn');
  if (saveBtn && appState.currentObjectUrl) {
    saveBtn.href = appState.currentObjectUrl;
    saveBtn.download = appState.currentFilename || 'ray-ban-meta-spin-photo.jpg';
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  trackEvent('instagram_modal_opened');
}

function closeInstagramModal() {
  const modal = document.getElementById('insta-share-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

async function handleCopyImage() {
  if (!appState.currentObjectUrl) return;
  const copyBtnText = document.getElementById('insta-copy-btn-text');

  try {
    // In modern browsers, ClipboardItem requires image/png
    const img = new Image();
    img.src = appState.currentObjectUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 3024;
    canvas.height = img.naturalHeight || 4032;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (pngBlob && navigator.clipboard && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob })
      ]);
      if (copyBtnText) {
        copyBtnText.textContent = 'Copied! Paste in Instagram';
        setTimeout(() => {
          copyBtnText.textContent = 'Copy Image';
        }, 3000);
      }
      trackEvent('instagram_image_copied');
      return;
    }
  } catch (err) {
    console.warn('Clipboard write failed:', err);
  }

  if (copyBtnText) {
    copyBtnText.textContent = 'Copied!';
    setTimeout(() => {
      copyBtnText.textContent = 'Copy Image';
    }, 2000);
  }
}

function handleOpenInstagramApp(e) {
  trackEvent('instagram_app_opened');
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (!isMobile) {
    // On desktop, navigate to Instagram web
    e.preventDefault();
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
  }
}

// ==========================================================================
// Direct Share to Instagram Story Handler
// ==========================================================================
async function handleShareImage() {
  if (!appState.currentBlob) return;
  trackEvent('share_to_instagram_clicked');

  const file = new File([appState.currentBlob], appState.currentFilename, { type: 'image/jpeg' });

  // 1. Mobile Web Share API: triggers OS native share sheet directly.
  // When user picks Instagram Stories, the image is passed directly into Instagram Story
  // memory buffer without the user having to save it in their gallery or storage first!
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
      });
      trackEvent('share_native_success');
      return;
    } catch (err) {
      if (err.name === 'AbortError') {
        // User closed the share sheet
        return;
      }
      console.warn('Native share failed:', err);
    }
  }

  // 2. Direct Instagram Story Action for Browsers / In-App Browsers / Desktop:
  // Copy the converted photo directly to clipboard memory (0 storage used)
  // and launch Instagram Story Camera directly via deep link!
  let copiedSuccessfully = false;
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      // Create PNG blob for universal clipboard support
      const img = new Image();
      img.src = appState.currentObjectUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 3024;
      canvas.height = img.naturalHeight || 4032;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (pngBlob) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': pngBlob })
        ]);
        copiedSuccessfully = true;
      }
    }
  } catch (clipErr) {
    console.warn('Direct clipboard copy attempt:', clipErr);
  }

  // Try opening Instagram Story Camera directly via deep link on mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    // Direct launch into Instagram Story Camera
    window.location.href = 'instagram://story-camera';
    
    // Show instant status toast
    if (copiedSuccessfully) {
      showUiSuccess('Photo copied directly to clipboard! Paste it right into your Instagram Story.');
    }
    
    // Fallback: If Instagram app does not take over in 1.2 seconds, display the interactive modal
    setTimeout(() => {
      openInstagramModal();
    }, 1200);
    return;
  }

  // Desktop or browsers requiring interactive guidance
  openInstagramModal();
}

// ==========================================================================
// Reset / Convert Another Handler
// ==========================================================================
function resetConverter() {
  clearUiError();
  const uploadCard = document.getElementById('upload-card');
  const resultCard = document.getElementById('result-card');
  const processingCard = document.getElementById('processing-card');

  const inputLib = document.getElementById('file-input-library');
  const inputCam = document.getElementById('file-input-camera');
  if (inputLib) inputLib.value = '';
  if (inputCam) inputCam.value = '';

  resultCard?.classList.add('hidden');
  processingCard?.classList.add('hidden');
  uploadCard?.classList.remove('hidden');

  uploadCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==========================================================================
// Sample Photo Generator for Instant Testing
// ==========================================================================
function loadSamplePhoto() {
  clearUiError();
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = 1920;
  sampleCanvas.height = 1080;
  const ctx = sampleCanvas.getContext('2d');
  if (!ctx) return;

  const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
  grad.addColorStop(0, '#171717');
  grad.addColorStop(0.5, '#7F0000');
  grad.addColorStop(1, '#FB0000');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1920, 1080);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.arc(960, 540, 360, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.arc(960, 540, 240, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 80px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MetaSpin 3D View', 960, 520);

  ctx.font = '600 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#F8F9FA';
  ctx.fillText('16:9 Landscape Sample → Converts to 3024 × 4032 (3:4)', 960, 585);

  sampleCanvas.toBlob((blob) => {
    if (blob) {
      const sampleFile = new File([blob], 'sample-landscape.jpg', { type: 'image/jpeg' });
      processImageFile(sampleFile);
    }
  }, 'image/jpeg', 0.95);
}

// ==========================================================================
// Initialize Event Listeners
// ==========================================================================
function initApp() {
  initHeaderScroll();
  initMobileDrawer();

  const inputLibrary = document.getElementById('file-input-library');
  const inputCamera = document.getElementById('file-input-camera');
  const dropZone = document.getElementById('drop-zone');

  const btnLibrary = document.getElementById('btn-action-library');
  const btnCamera = document.getElementById('btn-action-camera');
  const btnPaste = document.getElementById('btn-action-paste');
  const btnSample = document.getElementById('btn-load-sample');

  // Input triggers (safely handles both <label> and <button> wrappers)
  if (btnLibrary && btnLibrary.tagName !== 'LABEL') {
    btnLibrary.addEventListener('click', () => inputLibrary?.click());
  }

  if (btnCamera && btnCamera.tagName !== 'LABEL') {
    btnCamera.addEventListener('click', () => inputCamera?.click());
  }

  if (dropZone && dropZone.tagName !== 'LABEL') {
    dropZone.addEventListener('click', () => inputLibrary?.click());
  }

  btnSample?.addEventListener('click', loadSamplePhoto);

  inputLibrary?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) processImageFile(file);
  });

  inputCamera?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) processImageFile(file);
  });

  // Drag & Drop
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone?.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone?.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-active');
    });
  });

  dropZone?.addEventListener('drop', (e) => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) processImageFile(file);
  });

  // Keyboard accessibility
  dropZone?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputLibrary?.click();
    }
  });

  // Global Clipboard Paste
  document.addEventListener('paste', (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processImageFile(file);
          break;
        }
      }
    }
  });

  btnPaste?.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find((type) => type.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], 'pasted-photo.png', { type: imageType });
            processImageFile(file);
            return;
          }
        }
      }
      showUiError('Press Ctrl+V (or Cmd+V on Mac) anywhere on this page to paste your copied image.');
    } catch {
      showUiError('Press Ctrl+V (or Cmd+V on Mac) anywhere on this page to paste your copied image.');
    }
  });

  // Result Actions
  document.getElementById('share-btn')?.addEventListener('click', handleShareImage);
  document.getElementById('download-btn')?.addEventListener('click', () => {
    trackEvent('download_clicked', { filename: appState.currentFilename });
  });
  document.getElementById('reset-btn')?.addEventListener('click', resetConverter);

  // Instagram Story Modal Event Listeners
  document.getElementById('insta-modal-close')?.addEventListener('click', closeInstagramModal);
  document.getElementById('insta-modal-done')?.addEventListener('click', closeInstagramModal);
  document.getElementById('insta-modal-copy-btn')?.addEventListener('click', handleCopyImage);
  document.getElementById('insta-modal-launch-btn')?.addEventListener('click', handleOpenInstagramApp);
  document.getElementById('insta-modal-save-btn')?.addEventListener('click', () => {
    trackEvent('instagram_modal_save_clicked');
  });

  const instaModal = document.getElementById('insta-share-modal');
  instaModal?.addEventListener('click', (e) => {
    if (e.target === instaModal) {
      closeInstagramModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && instaModal && !instaModal.classList.contains('hidden')) {
      closeInstagramModal();
    }
  });

  // SEO Analytics & Ads
  initAnalytics();
  initAdSense();
  trackEvent('converter_open');
}

// Ensure execution whether loaded before or after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
