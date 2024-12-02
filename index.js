// API Keys
const REMOVE_BG_API_KEY = '8VAzuX5V7g1ccAhW3WGxPXhJ';
const RUNWAY_API_KEY = 'key_0cb7cdce1634ac16907cd03f76cc1c18427d6b818ebb0082e02654049f17c1ebc24e4c5613206266bb205ef73e98b555b0b52dfcbdde1341d0e144d3613dcca5';

// DOM Elements
const elements = {
    image1Input: document.getElementById('image1'),
    image2Input: document.getElementById('image2'),
    preview1: document.getElementById('preview1'),
    preview2: document.getElementById('preview2'),
    processed1: document.getElementById('processed1'),
    processed2: document.getElementById('processed2'),
    removeBackgroundButton: document.getElementById('removeBackgroundButton'),
    mergeButton: document.getElementById('mergeButton'),
    loading: document.querySelector('.loading'),
    progress: document.querySelector('.progress'),
    generateVideoBtn: document.getElementById('generateVideoBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    videoPreview: document.getElementById('videoPreview'),
    loadingText: document.getElementById('loadingText'),
    progressFill: document.querySelector('.progress-fill')
};

// Canvas initialization
const canvas = new fabric.Canvas('resultCanvas');

// State management
let state = {
    image1Loaded: false,
    image2Loaded: false,
    image1Processed: false,
    image2Processed: false,
    generatedVideoUrl: null
};

// Image handling functions
function handleImageUpload(file, previewElement, isFirstImage) {
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewElement.src = e.target.result;
            if (isFirstImage) {
                state.image1Loaded = true;
                state.image1Processed = false;
                elements.processed1.style.display = 'none';
            } else {
                state.image2Loaded = true;
                state.image2Processed = false;
                elements.processed2.style.display = 'none';
            }
            checkImagesLoaded();
        };
        reader.readAsDataURL(file);
    }
}

function checkImagesLoaded() {
    elements.removeBackgroundButton.disabled = !(state.image1Loaded && state.image2Loaded);
    elements.mergeButton.disabled = !(state.image1Processed && state.image2Processed);
}

// Background removal functions
async function removeBackground(imageFile) {
    const formData = new FormData();
    formData.append('image_file', imageFile);

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
            'X-Api-Key': REMOVE_BG_API_KEY,
        },
        body: formData
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

async function processImages() {
    elements.loading.classList.add('active');
    elements.progress.style.width = '0%';

    try {
        // Process first image
        elements.progress.style.width = '25%';
        const processedImage1Url = await removeBackground(elements.image1Input.files[0]);
        elements.processed1.src = processedImage1Url;
        elements.processed1.style.display = 'block';
        state.image1Processed = true;

        // Process second image
        elements.progress.style.width = '75%';
        const processedImage2Url = await removeBackground(elements.image2Input.files[0]);
        elements.processed2.src = processedImage2Url;
        elements.processed2.style.display = 'block';
        state.image2Processed = true;

        elements.progress.style.width = '100%';
        checkImagesLoaded();
    } catch (error) {
        console.error('Error removing background:', error);
        alert('Error removing background. Please check your API key and try again.');
    } finally {
        setTimeout(() => {
            elements.loading.classList.remove('active');
            elements.progress.style.width = '0%';
        }, 1000);
    }
}

// Image merging functions
function loadFabricImage(src) {
    return new Promise((resolve, reject) => {
        fabric.Image.fromURL(src, (img) => {
            if (img) {
                resolve(img);
            } else {
                reject(new Error('Failed to load image'));
            }
        });
    });
}

async function mergeImages() {
    elements.loading.classList.add('active');
    elements.progress.style.width = '0%';
    try {
        canvas.clear();
        const maxWidth = 800;
        const maxHeight = 400;

        // Set initial canvas dimensions
        canvas.setWidth(maxWidth);
        canvas.setHeight(maxHeight);

        elements.progress.style.width = '30%';

        const [fabricImage1, fabricImage2] = await Promise.all([
            loadFabricImage(elements.processed1.src),
            loadFabricImage(elements.processed2.src)
        ]);

        elements.progress.style.width = '60%';

        // Calculate proportional scaling to maintain aspect ratio
        const calculateScale = (image, maxWidth, maxHeight) => {
            // Calculate scales for width and height
            const widthScale = maxWidth / (image.width);
            const heightScale = maxHeight / (image.height);

            // Use the smaller scale to ensure entire image fits
            return Math.min(widthScale, heightScale);
        };

        // Calculate scales for both images
        const scale1 = calculateScale(fabricImage1, maxWidth / 2, maxHeight);
        const scale2 = calculateScale(fabricImage2, maxWidth / 2, maxHeight);

        // Apply the smaller of the two scales to ensure consistency
        const finalScale = Math.min(scale1, scale2);

        // Scale images
        fabricImage1.scale(finalScale);
        fabricImage2.scale(finalScale);

        // Calculate positions to center images vertically and place side by side
        const totalWidth = fabricImage1.getScaledWidth() + fabricImage2.getScaledWidth();
        const leftOffset = (maxWidth - totalWidth) / 2;

        // Position images
        fabricImage1.set({
            left: leftOffset,
            top: (maxHeight - fabricImage1.getScaledHeight()) / 2,
            selectable: false
        });

        fabricImage2.set({
            left: leftOffset + fabricImage1.getScaledWidth(),
            top: (maxHeight - fabricImage2.getScaledHeight()) / 2,
            selectable: false
        });

        // Adjust canvas height to fit the images
        const maxScaledHeight = Math.max(
            fabricImage1.getScaledHeight(), 
            fabricImage2.getScaledHeight()
        );
        canvas.setHeight(maxScaledHeight);

        // Add images to canvas
        canvas.add(fabricImage1);
        canvas.add(fabricImage2);
        canvas.renderAll();

        // Store merged image for further use
        const mergedImage = canvas.toDataURL({
            format: 'png',
            quality: 1
        });

        // Download the merged image
        const link = document.createElement('a');
        link.href = mergedImage;
        link.download = 'MergedImage.png';
        link.click();

        elements.progress.style.width = '90%';
        elements.generateVideoBtn.disabled = false;
        elements.progress.style.width = '100%';

        return mergedImage;
    } catch (error) {
        console.error('Error merging images:', error);
        alert('Error merging images. Please try again.');
    } finally {
        setTimeout(() => {
            elements.loading.classList.remove('active');
            elements.progress.style.width = '0%';
        }, 1000);
    }
}



async function generateAnimation() {
    try {
        // Create a temporary canvas for recording
        const videoCanvas = document.createElement('canvas');
        const ctx = videoCanvas.getContext('2d');
        
        // Set canvas dimensions to match merged image
        const width = canvas.width;
        const height = canvas.height;
        videoCanvas.width = width;
        videoCanvas.height = height;

        // Create video element
        const videoStream = videoCanvas.captureStream(30); // 30 fps
        const mediaRecorder = new MediaRecorder(videoStream, { 
            mimeType: 'video/webm' 
        });

        // Prepare recorded chunks
        const chunks = [];
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const videoUrl = URL.createObjectURL(blob);
            
            // Update UI
            elements.videoPreview.src = videoUrl;
            elements.videoPreview.style.display = 'block';
            state.generatedVideoUrl = videoUrl;
            
            elements.loadingText.textContent = 'Animation generated!';
            elements.downloadBtn.disabled = false;
            elements.progressFill.style.width = '100%';
        };

        // Clone canvas objects for animation
        const animationObjects = canvas.getObjects().map(obj => {
            const clone = fabric.util.object.clone(obj);
            // Store original positions
            clone.originalLeft = clone.left;
            clone.originalTop = clone.top;
            clone.originalWidth = clone.width;
            clone.originalHeight = clone.height;
            return clone;
        });

        // Identify left and right characters
        const leftCharacter = animationObjects.find(obj => obj.originalLeft < width / 2);
        const rightCharacter = animationObjects.find(obj => obj.originalLeft >= width / 2);

        // Start recording
        mediaRecorder.start();

        // Animation parameters
        const duration = 6000; // 6 seconds
        const startTime = performance.now();

        function easeInOutQuad(t) {
            // Smooth acceleration and deceleration
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        }

        function animate() {
            const currentTime = performance.now();
            const elapsed = currentTime - startTime;
            
            // Clear canvas
            ctx.clearRect(0, 0, width, height);

            // Calculate progress (0 to 1) with easing
            const rawProgress = elapsed / duration;
            const progress = easeInOutQuad(Math.min(rawProgress, 1));

            // Movement and interaction stages
            animationObjects.forEach(obj => {
                // Reset to original position
                obj.set({
                    left: obj.originalLeft,
                    top: obj.originalTop,
                    angle: 0,
                    scaleX: 1,
                    scaleY: 1
                });

                // Walking towards each other (first 2/3 of animation)
                if (progress < 0.66) {
                    if (obj === leftCharacter) {
                        // More natural walking movement from left
                        const moveDistance = progress * (width / 2 - obj.originalLeft);
                        const walkCycle = Math.sin(elapsed * 0.01) * 5; // Subtle body sway
                        
                        obj.set({
                            left: obj.originalLeft + moveDistance,
                            top: obj.originalTop + walkCycle,
                            angle: walkCycle * 0.5, // Slight body rotation with walk
                            scaleX: 1 + Math.abs(Math.sin(elapsed * 0.01)) * 0.05, // Subtle breathing effect
                            scaleY: 1 - Math.abs(Math.sin(elapsed * 0.01)) * 0.05
                        });
                    }

                    if (obj === rightCharacter) {
                        // More natural walking movement from right
                        const moveDistance = -progress * (obj.originalLeft - width / 2);
                        const walkCycle = Math.sin(elapsed * 0.01 + Math.PI) * 5; // Offset walk cycle
                        
                        obj.set({
                            left: obj.originalLeft + moveDistance,
                            top: obj.originalTop + walkCycle,
                            angle: walkCycle * 0.5,
                            scaleX: 1 + Math.abs(Math.sin(elapsed * 0.01 + Math.PI)) * 0.05,
                            scaleY: 1 - Math.abs(Math.sin(elapsed * 0.01 + Math.PI)) * 0.05
                        });
                    }
                }

                // Handshake interaction (last 1/3 of animation)
                if (progress >= 0.66) {
                    const handshakeProgress = (progress - 0.66) * 3; // Normalize to 0-1
                    const shakeIntensity = Math.sin(elapsed * 0.2) * 10 * handshakeProgress;
                    
                    if (obj === leftCharacter) {
                        obj.set({
                            left: width / 2 - obj.originalWidth / 2,
                            angle: -10 + shakeIntensity,
                            scaleX: 1 + Math.abs(Math.sin(elapsed * 0.1)) * 0.1,
                            scaleY: 1 - Math.abs(Math.sin(elapsed * 0.1)) * 0.1
                        });
                    }

                    if (obj === rightCharacter) {
                        obj.set({
                            left: width / 2 + obj.originalWidth / 2,
                            angle: 10 - shakeIntensity,
                            scaleX: 1 + Math.abs(Math.sin(elapsed * 0.1 + Math.PI)) * 0.1,
                            scaleY: 1 - Math.abs(Math.sin(elapsed * 0.1 + Math.PI)) * 0.1
                        });
                    }
                }

                // Render object
                obj.render(ctx);
            });

            // Update progress bar
            elements.progressFill.style.width = `${(elapsed / duration) * 100}%`;
            elements.loadingText.textContent = 'Generating animation...';

            // Continue animation
            if (elapsed < duration) {
                requestAnimationFrame(animate);
            } else {
                // Stop recording
                mediaRecorder.stop();
            }
        }

        // Start animation
        animate();

    } catch (error) {
        console.error('Animation generation error:', error);
        elements.loadingText.textContent = 'Error generating animation. Please try again.';
        elements.progressFill.style.width = '0%';
        alert('Failed to generate animation. Please try again.');
    }
}

// Update the download function to handle errors better
async function downloadVideo() {
    if (state.generatedVideoUrl) {
        try {
            elements.loadingText.textContent = 'Downloading video...';
            elements.downloadBtn.disabled = true;

            const response = await fetch(state.generatedVideoUrl);
            if (!response.ok) {
                throw new Error(`Failed to download video: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'animated_merger.mp4';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            elements.loadingText.textContent = 'Download complete!';
        } catch (error) {
            console.error('Download error:', error);
            elements.loadingText.textContent = 'Error downloading video. Please try again.';
        } finally {
            elements.downloadBtn.disabled = false;
        }
    }
}

// Event listeners
function initializeEventListeners() {
    // File input listeners
    elements.image1Input.addEventListener('change', (e) => {
        handleImageUpload(e.target.files[0], elements.preview1, true);
    });

    elements.image2Input.addEventListener('change', (e) => {
        handleImageUpload(e.target.files[0], elements.preview2, false);
    });

    // Button listeners
    elements.removeBackgroundButton.addEventListener('click', processImages);
    elements.mergeButton.addEventListener('click', mergeImages);
    elements.generateVideoBtn.addEventListener('click', async () => {
        elements.generateVideoBtn.disabled = true;
        elements.downloadBtn.disabled = true;
        elements.progressFill.style.width = '0%';
        await generateAnimation();
        elements.generateVideoBtn.disabled = false;
    });
    elements.downloadBtn.addEventListener('click', downloadVideo);

    // Drag and drop handlers
    document.querySelectorAll('.upload-box').forEach((box, index) => {
        box.addEventListener('dragover', (e) => {
            e.preventDefault();
            box.style.borderColor = '#666';
        });

        box.addEventListener('dragleave', (e) => {
            e.preventDefault();
            box.style.borderColor = '#ccc';
        });

        box.addEventListener('drop', (e) => {
            e.preventDefault();
            box.style.borderColor = '#ccc';
            
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                if (index === 0) {
                    handleImageUpload(file, elements.preview1, true);
                    elements.image1Input.files = e.dataTransfer.files;
                } else {
                    handleImageUpload(file, elements.preview2, false);
                    elements.image2Input.files = e.dataTransfer.files;
                }
            }
        });
    });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', initializeEventListeners);