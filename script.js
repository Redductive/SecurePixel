const CONFIG = {
    getApiKey: () => atob("NGI1Mjc0MzdiMzJhNjg4OTRjODhjYmRmNDdjNWMzNjU="),
    algo: { name: "AES-GCM", length: 256 },
    kdf: "PBKDF2",
    saltLen: 16,
    ivLen: 12
};

let encFilesQueue = [];
let decFilesQueue = [];
let generatedBlobs = { enc: [], dec: [] };

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initDragAndDrop();
    initImageViewer();
    
    switchTab('encrypt');
});

function initTheme() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (saved === 'dark' || (!saved && prefersDark)) {
        document.documentElement.classList.add('dark');
        document.querySelector('#theme-toggle i').classList.replace('fa-moon', 'fa-sun');
    }
    
    document.getElementById('theme-toggle').addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        const icon = document.querySelector('#theme-toggle i');
        icon.className = isDark ? 'fa-solid fa-sun text-xl' : 'fa-solid fa-moon text-xl';
    });
}

function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    const colors = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
    const icon = type === 'error' ? 'fa-circle-xmark' : type === 'success' ? 'fa-circle-check' : 'fa-circle-info';
    
    toast.className = `${colors} text-white px-6 py-4 rounded-lg shadow-lg transform translate-x-full transition-all duration-300 flex items-center gap-3 min-w-[300px]`;
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span class="font-sans font-medium">${msg}</span>`;
    
    container.appendChild(toast);
    
    requestAnimationFrame(() => toast.classList.remove('translate-x-full'));
    
    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function initImageViewer() {
    const viewer = document.getElementById('image-viewer');
    const img = document.getElementById('full-image');
    const close = document.getElementById('close-viewer');
    
    const closeViewer = () => {
        viewer.classList.remove('opacity-100');
        img.classList.remove('scale-100');
        setTimeout(() => viewer.classList.add('hidden'), 300);
    };
    
    close.onclick = closeViewer;
    viewer.onclick = (e) => { if(e.target === viewer) closeViewer(); };
    
    window.openViewer = (src) => {
        img.src = src;
        viewer.classList.remove('hidden');
        requestAnimationFrame(() => {
            viewer.classList.add('opacity-100');
            img.classList.add('scale-100');
        });
    };
}

function initDragAndDrop() {
    const setup = (zoneId, inputId, queue, previewId) => {
        const zone = document.getElementById(zoneId);
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        
        const updatePreviews = () => {
            preview.innerHTML = '';
            queue.forEach((file, idx) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const div = document.createElement('div');
                    div.className = 'relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 shadow-sm group';
                    div.innerHTML = `
                        <img src="${e.target.result}" class="w-full h-full object-cover cursor-pointer" onclick="openViewer('${e.target.result}')">
                        <button onclick="removeFromQueue('${inputId}', ${idx})" class="absolute top-0 right-0 bg-red-500 text-white p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"><i class="fa-solid fa-times"></i></button>
                    `;
                    preview.appendChild(div);
                };
                reader.readAsDataURL(file);
            });
        };

        window.removeFromQueue = (inpId, index) => {
            if(inpId === 'enc-files') encFilesQueue.splice(index, 1);
            else decFilesQueue.splice(index, 1);
            updatePreviews();
        };

        input.onchange = (e) => {
            Array.from(e.target.files).forEach(f => queue.push(f));
            updatePreviews();
            input.value = '';
        };
        
        zone.onclick = () => input.click();
        
        zone.ondragover = (e) => { e.preventDefault(); zone.classList.add('border-primary', 'bg-yellow-50', 'dark:bg-yellow-900/10'); };
        zone.ondragleave = () => { zone.classList.remove('border-primary', 'bg-yellow-50', 'dark:bg-yellow-900/10'); };
        zone.ondrop = (e) => {
            e.preventDefault();
            zone.classList.remove('border-primary', 'bg-yellow-50', 'dark:bg-yellow-900/10');
            Array.from(e.dataTransfer.files).forEach(f => queue.push(f));
            updatePreviews();
        };
    };

    setup('enc-drop-zone', 'enc-files', encFilesQueue, 'enc-previews');
    setup('dec-drop-zone', 'dec-files', decFilesQueue, 'dec-previews');
}

function togglePassword(id, btn) {
    const inp = document.getElementById(id);
    const icon = btn.querySelector('i');
    if(inp.type === "password") {
        inp.type = "text";
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        inp.type = "password";
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw", enc.encode(password), { name: CONFIG.kdf }, false, ["deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
        { name: CONFIG.kdf, salt: salt, iterations: 100000, hash: "SHA-256" },
        keyMaterial, CONFIG.algo, false, ["encrypt", "decrypt"]
    );
}

function bufferToCanvas(buffer) {
    const numPixels = Math.ceil(buffer.length / 3);
    const side = Math.ceil(Math.sqrt(numPixels));
    const canvas = document.createElement('canvas');
    canvas.width = side; 
    canvas.height = side;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(side, side);
    
    let bufIdx = 0;
    for (let i = 0; i < imgData.data.length; i += 4) {
        imgData.data[i] = bufIdx < buffer.length ? buffer[bufIdx++] : Math.floor(Math.random()*255); 
        imgData.data[i+1] = bufIdx < buffer.length ? buffer[bufIdx++] : Math.floor(Math.random()*255); 
        imgData.data[i+2] = bufIdx < buffer.length ? buffer[bufIdx++] : Math.floor(Math.random()*255); 
        imgData.data[i+3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
}

async function uploadToImgBB(blob, resultDiv) {
    const formData = new FormData();
    formData.append("image", blob);

    const statusId = `status-${Date.now()}-${Math.random()}`;
    resultDiv.innerHTML += `<div id="${statusId}" class="mt-3 text-xs font-bold text-blue-500 animate-pulse"><i class="fa-solid fa-cloud-arrow-up"></i> Uploading to cloud...</div>`;
    const statusEl = document.getElementById(statusId);

    try {
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${CONFIG.getApiKey()}`, {
            method: "POST",
            body: formData
        });
        const data = await res.json();
        
        if (data.success) {
            statusEl.className = "mt-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded p-2 flex items-center justify-between";
            statusEl.innerHTML = `
                <div class="text-green-700 dark:text-green-400 text-xs truncate max-w-[200px]">
                    <i class="fa-solid fa-link mr-1"></i> ${data.data.url_viewer}
                </div>
                <button onclick="navigator.clipboard.writeText('${data.data.url_viewer}'); showToast('URL Copied!', 'success')" class="text-green-700 dark:text-green-400 hover:text-green-900 font-bold text-xs ml-2">
                    COPY
                </button>
            `;
            showToast("Image Uploaded Successfully", "success");
        } else {
            throw new Error(data.error ? data.error.message : "Upload failed");
        }
    } catch (e) {
        statusEl.className = "mt-3 text-xs font-bold text-red-500";
        statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Upload Failed`;
        console.error(e);
    }
}

async function processBulkEncryption() {
    const password = document.getElementById('enc-password').value;
    const container = document.getElementById('enc-results-container');
    const btn = document.querySelector('button[onclick="processBulkEncryption()"]');
    
    if (encFilesQueue.length === 0) return showToast("Please add images first", "error");
    if (!password) return showToast("Password is required", "error");

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...`;
    
    container.innerHTML = '';
    generatedBlobs.enc = [];

    try {
        for (const file of encFilesQueue) {
            const fileBuffer = await file.arrayBuffer();
            const salt = window.crypto.getRandomValues(new Uint8Array(CONFIG.saltLen));
            const iv = window.crypto.getRandomValues(new Uint8Array(CONFIG.ivLen));
            
            const key = await deriveKey(password, salt);
            const encryptedData = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv }, key, fileBuffer
            );

            const dataLen = encryptedData.byteLength;
            const totalLen = 4 + CONFIG.saltLen + CONFIG.ivLen + dataLen;
            const combined = new Uint8Array(totalLen);
            const view = new DataView(combined.buffer);
            
            view.setUint32(0, dataLen, true);
            combined.set(salt, 4);
            combined.set(iv, 4 + CONFIG.saltLen);
            combined.set(new Uint8Array(encryptedData), 4 + CONFIG.saltLen + CONFIG.ivLen);

            const canvas = bufferToCanvas(combined);
            
            canvas.toBlob(blob => {
                generatedBlobs.enc.push({ name: `encrypted_${file.name}.png`, blob: blob });
                
                const card = document.createElement('div');
                card.className = "bg-white dark:bg-dark border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow";
                
                const imgURL = URL.createObjectURL(blob);
                
                card.innerHTML = `
                    <div class="relative group cursor-pointer overflow-hidden rounded-md border border-gray-100 dark:border-gray-600 aspect-square bg-gray-100">
                        <img src="${imgURL}" class="w-full h-full object-cover" onclick="openViewer('${imgURL}')">
                        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <i class="fa-solid fa-expand text-white text-2xl"></i>
                        </div>
                    </div>
                    <div class="mt-3 flex gap-2">
                        <a href="${imgURL}" download="encrypted_${file.name}.png" class="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-center py-2 rounded text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors">
                            <i class="fa-solid fa-download"></i> Save
                        </a>
                    </div>
                `;
                
                container.appendChild(card);
                uploadToImgBB(blob, card);
            }, 'image/png');
        }
        
        if (encFilesQueue.length > 1) document.getElementById('enc-bulk-actions').classList.remove('hidden');
        showToast(`Processed ${encFilesQueue.length} images`, "success");

    } catch (e) {
        showToast(e.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-bolt"></i> Encrypt & Upload`;
    }
}

async function processBulkDecryption() {
    const password = document.getElementById('dec-password').value;
    const container = document.getElementById('dec-results-container');
    const btn = document.querySelector('button[onclick="processBulkDecryption()"]');

    if (decFilesQueue.length === 0) return showToast("Upload noise images first", "error");
    if (!password) return showToast("Password is required", "error");

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...`;
    
    container.innerHTML = '';
    generatedBlobs.dec = [];

    try {
        for (const file of decFilesQueue) {
            const bitmap = await createImageBitmap(file);
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0);
            
            const pixels = ctx.getImageData(0,0,canvas.width,canvas.height).data;
            const totalBytes = canvas.width * canvas.height * 3;
            const buffer = new Uint8Array(totalBytes);
            let bufIdx = 0;
            for(let i=0; i<pixels.length; i+=4) {
                if(bufIdx < totalBytes) buffer[bufIdx++] = pixels[i];
                if(bufIdx < totalBytes) buffer[bufIdx++] = pixels[i+1];
                if(bufIdx < totalBytes) buffer[bufIdx++] = pixels[i+2];
            }

            const view = new DataView(buffer.buffer);
            const dataLen = view.getUint32(0, true);
            
            if(dataLen > buffer.length) throw new Error("File is not a valid noise image");

            const salt = buffer.slice(4, 4 + CONFIG.saltLen);
            const iv = buffer.slice(4 + CONFIG.saltLen, 4 + CONFIG.saltLen + CONFIG.ivLen);
            const encData = buffer.slice(4 + CONFIG.saltLen + CONFIG.ivLen, 4 + CONFIG.saltLen + CONFIG.ivLen + dataLen);

            const key = await deriveKey(password, salt);
            const decBuffer = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv }, key, encData
            );

            const blob = new Blob([decBuffer]);
            generatedBlobs.dec.push({ name: `decrypted_${file.name.replace('.png','')}`, blob: blob });

            const imgURL = URL.createObjectURL(blob);
            
            const card = document.createElement('div');
            card.className = "bg-white dark:bg-dark border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm";
            card.innerHTML = `
                <div class="relative group cursor-pointer overflow-hidden rounded-md border border-gray-100 dark:border-gray-600 aspect-square bg-gray-100">
                    <img src="${imgURL}" class="w-full h-full object-cover" onclick="openViewer('${imgURL}')">
                     <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <i class="fa-solid fa-expand text-white text-2xl"></i>
                    </div>
                </div>
                <a href="${imgURL}" download="decrypted.png" class="block w-full mt-3 bg-primary hover:bg-yellow-400 text-center py-2 rounded text-xs font-bold text-darker transition-colors">
                    <i class="fa-solid fa-download"></i> Save Image
                </a>
            `;
            container.appendChild(card);
        }
        
        if (decFilesQueue.length > 1) document.getElementById('dec-bulk-actions').classList.remove('hidden');
        showToast("Decryption Successful", "success");

    } catch (e) {
        showToast("Wrong password or corrupted file", "error");
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-unlock"></i> Decrypt All`;
    }
}

function downloadAll(type) {
    const zip = new JSZip();
    const blobs = type === 'enc' ? generatedBlobs.enc : generatedBlobs.dec;
    
    if (blobs.length === 0) return;

    blobs.forEach((item, i) => {
        const ext = type === 'enc' ? '.png' : (item.blob.type.split('/')[1] === 'jpeg' ? '.jpg' : '.png');
        zip.file(item.name || `image_${i}${ext}`, item.blob);
    });

    zip.generateAsync({type:"blob"}).then(function(content) {
        saveAs(content, "securepixel_images.zip");
    });
}

function switchTab(tab) {
    document.querySelectorAll('.section-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`${tab}-section`).classList.remove('hidden');
    
    document.getElementById('tab-encrypt').classList.replace('text-primary', 'text-gray-500');
    document.getElementById('tab-encrypt').classList.replace('border-primary', 'border-transparent');
    document.getElementById('tab-decrypt').classList.replace('text-primary', 'text-gray-500');
    document.getElementById('tab-decrypt').classList.replace('border-primary', 'border-transparent');
    
    const activeBtn = document.getElementById(`tab-${tab}`);
    activeBtn.classList.replace('text-gray-500', 'text-primary');
    activeBtn.classList.replace('border-transparent', 'border-primary');
    
    anime({
        targets: `#${tab}-section`,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 400,
        easing: 'easeOutQuad'
    });
}
// --- PWA Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('Service Worker Registered'))
            .catch(err => console.log('Service Worker Failed', err));
    });
}
// --- GDPR/CCPA Cookie Consent & Dual-Stream Analytics ---

const cookieBanner = document.getElementById('cookie-banner');
const acceptBtn = document.getElementById('cookie-accept');
const declineBtn = document.getElementById('cookie-decline');

// 1. Define your Stream IDs
// Copy these from your Google Analytics "Data Streams" page
const GA_ID_CUSTOM = 'G-H0FYEM7XH2'; // Replace with ID for dippanbhusal.tech
const GA_ID_VERCEL = 'G-4JFCC0CE80'; // Replace with ID for vercel.app

// 2. Determine which ID to use based on the current URL
let activeGA_ID = null;

if (window.location.hostname.includes('dippanbhusal.tech')) {
    activeGA_ID = GA_ID_CUSTOM;
} else if (window.location.hostname.includes('vercel.app')) {
    activeGA_ID = GA_ID_VERCEL;
} else {
    // Fallback: If testing on localhost, you can choose one or leave null
    console.log('SecurePixel: Running on localhost or unknown domain.');
}

// 3. Function to load the correct Analytics ID
function loadAnalytics() {
    if (!activeGA_ID) return; // Don't load if no ID matches

    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${activeGA_ID}`;
    
    const script2 = document.createElement('script');
    script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${activeGA_ID}', { 'anonymize_ip': true });
    `;

    document.head.appendChild(script1);
    document.head.appendChild(script2);
    
    console.log(`SecurePixel: Analytics loaded for ${window.location.hostname} (${activeGA_ID})`);
}

// 4. Check LocalStorage on load
window.addEventListener('load', () => {
    const consent = localStorage.getItem('securepixel_consent');

    if (consent === 'granted') {
        loadAnalytics();
    } else if (consent === 'denied') {
        // User previously declined; do nothing.
    } else {
        // Show Banner (First time visitor)
        setTimeout(() => {
            cookieBanner.classList.remove('hidden');
            requestAnimationFrame(() => {
                cookieBanner.classList.remove('translate-y-10', 'opacity-0');
            });
        }, 1000);
    }
});

// 5. Handle Accept
acceptBtn.addEventListener('click', () => {
    localStorage.setItem('securepixel_consent', 'granted');
    // This timestamp is your "Consent Proof" mentioned by Niles Singh
    localStorage.setItem('securepixel_consent_date', new Date().toISOString()); 
    
    // Animate banner away
    cookieBanner.classList.add('opacity-0', 'translate-y-10');
    setTimeout(() => cookieBanner.classList.add('hidden'), 300);
    
    loadAnalytics();
});

// 6. Handle Decline
declineBtn.addEventListener('click', () => {
    localStorage.setItem('securepixel_consent', 'denied');
    localStorage.setItem('securepixel_consent_date', new Date().toISOString());
    
    cookieBanner.classList.add('opacity-0', 'translate-y-10');
    setTimeout(() => cookieBanner.classList.add('hidden'), 300);
});
