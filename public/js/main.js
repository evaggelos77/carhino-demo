document.addEventListener('DOMContentLoaded', () => {
  const lang = document.documentElement.lang === 'en' ? 'en' : 'el';
  const i18n = {
    el: {
      noFile: 'Δεν επιλέχθηκε αρχείο ακόμα',
      optionalFile: 'Προαιρετικό αρχείο',
      cameraStart: 'Πάτησε άνοιγμα κάμερας για να ξεκινήσει η προεπισκόπηση.',
      cameraUnsupported: 'Η κάμερα δεν υποστηρίζεται από αυτόν τον browser. Χρησιμοποίησε το πεδίο επιλογής αρχείου.',
      cameraConnecting: 'Γίνεται σύνδεση με την κάμερα...',
      cameraReady: 'Η κάμερα είναι έτοιμη. Κράτησε το έγγραφο μέσα στο πλάνο και πάτησε «Τράβηξε φωτογραφία».',
      cameraFailed: 'Δεν άνοιξε η κάμερα. Έλεγξε άδεια κάμερας στον browser ή χρησιμοποίησε το πεδίο επιλογής αρχείου.',
      cameraCaptureFailed: 'Αποτυχία λήψης φωτογραφίας. Δοκίμασε ξανά.',
      cameraCaptureSuccess: 'Η φωτογραφία μπήκε στο πεδίο επιτυχώς.',
      cameraSharpnessChecking: 'Έλεγχος καθαρότητας...',
      cameraSharpnessGood: 'Καθαρή εικόνα — το έγγραφο φαίνεται σωστά μέσα στο πλαίσιο.',
      cameraSharpnessSoft: 'Η εικόνα είναι λίγο μαλακή. Κράτησε σταθερά την κάμερα και γέμισε το πλαίσιο με το έγγραφο.',
      cameraSharpnessBlurry: 'Η λήψη δείχνει θολή. Ξαναβγάλε τη φωτογραφία πιο σταθερά και πιο κοντά στο έγγραφο.',
      cameraRetakePrompt: 'Η φωτογραφία βγήκε θολή. Κράτησε το έγγραφο μέσα στο πλαίσιο και πάτησε ξανά «Τράβηξε φωτογραφία».',
      basicDocs: 'βασικά έγγραφα'
    },
    en: {
      noFile: 'No file selected yet',
      optionalFile: 'Optional file',
      cameraStart: 'Press open camera to start the preview.',
      cameraUnsupported: 'Camera is not supported by this browser. Use the file picker instead.',
      cameraConnecting: 'Connecting to camera...',
      cameraReady: 'Camera is ready. Keep the document inside the frame and press “Capture photo”.',
      cameraFailed: 'Camera could not be opened. Check browser camera permission or use the file picker.',
      cameraCaptureFailed: 'Photo capture failed. Please try again.',
      cameraCaptureSuccess: 'The photo was added to the field successfully.',
      cameraSharpnessChecking: 'Checking sharpness...',
      cameraSharpnessGood: 'Clear image — the document looks good inside the frame.',
      cameraSharpnessSoft: 'The image is a bit soft. Hold the camera steady and fill the frame with the document.',
      cameraSharpnessBlurry: 'The capture looks blurry. Retake the photo with a steadier hand and bring the document closer.',
      cameraRetakePrompt: 'The photo came out blurry. Keep the document inside the frame and press “Capture photo” again.',
      basicDocs: 'basic documents'
    }
  };
  const tr = (key) => i18n[lang][key] || i18n.el[key] || key;

  document.querySelectorAll('.faq').forEach((faq) => {
    const btn = faq.querySelector('button');
    if (!btn) return;
    btn.addEventListener('click', () => faq.classList.toggle('open'));
  });

  const form = document.querySelector('[data-multistep-form]');
  if (form) {
    const steps = Array.from(form.querySelectorAll('.form-step'));
    const progressItems = Array.from(document.querySelectorAll('.progress .item'));
    let index = 0;

    const showStep = (nextIndex) => {
      index = Math.max(0, Math.min(nextIndex, steps.length - 1));
      steps.forEach((step, i) => step.classList.toggle('active', i === index));
      progressItems.forEach((item, i) => item.classList.toggle('active', i <= index));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    form.querySelectorAll('[data-next-step]').forEach((btn) => {
      btn.addEventListener('click', () => showStep(index + 1));
    });
    form.querySelectorAll('[data-prev-step]').forEach((btn) => {
      btn.addEventListener('click', () => showStep(index - 1));
    });
    showStep(0);
  }

  const hiddenCameraFieldFor = (name) => document.querySelector(`[data-camera-hidden="${name}"]`);

  const renderPreview = (input, file, dataUrl) => {
    if (!input) return;
    const previewId = input.getAttribute('data-preview-target');
    const preview = document.getElementById(previewId);
    if (!preview) return;
    if (!file && !dataUrl) {
      preview.innerHTML = previewId.includes('address') || previewId.includes('income') || previewId.includes('extra') ? tr('optionalFile') : tr('noFile');
      return;
    }
    const source = dataUrl || file;
    const mimeType = file && file.type ? file.type : (typeof source === 'string' && source.startsWith('data:image/')) ? 'image/jpeg' : '';
    if (mimeType.startsWith('image/') || (typeof source === 'string' && source.startsWith('data:image/'))) {
      const img = document.createElement('img');
      img.alt = file && file.name ? file.name : 'camera-capture';
      img.style.width = '100%';
      img.style.objectFit = 'cover';
      img.style.maxHeight = '220px';
      if (dataUrl) {
        img.src = dataUrl;
        preview.innerHTML = '';
        preview.appendChild(img);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target.result;
          preview.innerHTML = '';
          preview.appendChild(img);
        };
        reader.readAsDataURL(file);
      }
    } else {
      preview.textContent = file && file.name ? file.name : tr('noFile');
    }
  };

  document.querySelectorAll('[data-preview-target]').forEach((input) => {
    input.addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0];
      const hiddenCameraField = hiddenCameraFieldFor(input.name);
      if (file && hiddenCameraField) hiddenCameraField.value = '';
      renderPreview(input, file, null);
    });
  });

  const liveName = document.querySelector('[data-live-name]');
  const livePhone = document.querySelector('[data-live-phone]');
  const liveEmail = document.querySelector('[data-live-email]');
  const liveDocs = document.querySelector('[data-live-docs]');
  const liveDocsSummary = document.querySelector('[data-live-docs-summary] strong');

  const bindText = (selector, target) => {
    const input = document.querySelector(selector);
    if (!input || !target) return;
    const sync = () => { target.textContent = input.value.trim() || '—'; };
    input.addEventListener('input', sync);
    sync();
  };

  bindText('input[name="fullName"]', liveName);
  bindText('input[name="phone"]', livePhone);
  bindText('input[name="email"]', liveEmail);

  const requiredDocNames = ['identityFront', 'identityBack', 'drivingLicense'];
  const updateDocsCount = () => {
    const count = requiredDocNames.filter((name) => {
      const input = document.querySelector(`input[name="${name}"]`);
      return input && input.files && input.files.length > 0;
    }).length;
    if (liveDocs) liveDocs.textContent = `${count} / 3`;
    if (liveDocsSummary) liveDocsSummary.textContent = `${count} / 3 ${tr('basicDocs')}`;
  };
  requiredDocNames.forEach((name) => {
    const input = document.querySelector(`input[name="${name}"]`);
    if (input) input.addEventListener('change', updateDocsCount);
  });
  updateDocsCount();

  const cameraModal = document.querySelector('[data-camera-modal]');
  const cameraVideo = document.querySelector('[data-camera-video]');
  const cameraCanvas = document.querySelector('[data-camera-canvas]');
  const cameraStatus = document.querySelector('[data-camera-status]');
  const cameraFocus = document.querySelector('[data-camera-focus]');
  const cameraStage = document.querySelector('.camera-stage');
  let cameraStream = null;
  let cameraTargetInput = null;
  let focusInterval = null;
  let lastFocusScore = null;
  let stereoFixEnabled = false;

  const stopCameraStream = () => {
    if (focusInterval) {
      clearInterval(focusInterval);
      focusInterval = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
  };

  const setFocusState = (kind, message) => {
    if (!cameraFocus) return;
    cameraFocus.className = 'camera-meter';
    if (kind) cameraFocus.classList.add(kind);
    cameraFocus.textContent = message;
  };

  const detectSplitStereoFeed = (ctx, width, height) => {
    if (!ctx || width < 900 || height < 400) return false;
    const halfWidth = Math.floor(width / 2);
    if (halfWidth < 400) return false;

    const sampleCanvas = document.createElement('canvas');
    const sampleWidth = 64;
    const sampleHeight = 64;
    sampleCanvas.width = sampleWidth;
    sampleCanvas.height = sampleHeight;
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

    const sourceY = Math.floor(height * 0.18);
    const sourceH = Math.floor(height * 0.64);

    sampleCtx.clearRect(0, 0, sampleWidth, sampleHeight);
    sampleCtx.drawImage(ctx.canvas, 0, sourceY, halfWidth, sourceH, 0, 0, sampleWidth, sampleHeight);
    const left = sampleCtx.getImageData(0, 0, sampleWidth, sampleHeight).data;

    sampleCtx.clearRect(0, 0, sampleWidth, sampleHeight);
    sampleCtx.drawImage(ctx.canvas, halfWidth, sourceY, halfWidth, sourceH, 0, 0, sampleWidth, sampleHeight);
    const right = sampleCtx.getImageData(0, 0, sampleWidth, sampleHeight).data;

    let totalDiff = 0;
    for (let i = 0; i < left.length; i += 4) {
      totalDiff += Math.abs(left[i] - right[i]);
      totalDiff += Math.abs(left[i + 1] - right[i + 1]);
      totalDiff += Math.abs(left[i + 2] - right[i + 2]);
    }

    const meanDiff = totalDiff / (sampleWidth * sampleHeight * 3);
    return meanDiff < 22;
  };

  const updateStereoPreviewMode = (enabled) => {
    stereoFixEnabled = Boolean(enabled);
    if (!cameraStage) return;
    cameraStage.classList.toggle('stereo-fix', stereoFixEnabled);
  };

  const getVideoSourceRegion = (width, height) => {
    if (stereoFixEnabled) {
      return { sx: 0, sy: 0, sWidth: Math.floor(width / 2), sHeight: height };
    }
    return { sx: 0, sy: 0, sWidth: width, sHeight: height };
  };

  const drawCurrentVideoFrame = (ctx, width, height) => {
    const { sx, sy, sWidth, sHeight } = getVideoSourceRegion(width, height);
    ctx.drawImage(cameraVideo, sx, sy, sWidth, sHeight, 0, 0, width, height);
  };

  const cropRegionFromVideo = (width, height) => {
    const cropWidth = Math.floor(width * 0.72);
    const cropHeight = Math.floor(height * 0.58);
    const x = Math.floor((width - cropWidth) / 2);
    const y = Math.floor((height - cropHeight) / 2);
    return { x, y, cropWidth, cropHeight };
  };

  const computeSharpnessScore = (ctx, width, height) => {
    const sampleCanvas = document.createElement('canvas');
    const targetW = 220;
    const targetH = 160;
    sampleCanvas.width = targetW;
    sampleCanvas.height = targetH;
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    const { x, y, cropWidth, cropHeight } = cropRegionFromVideo(width, height);
    sampleCtx.drawImage(ctx.canvas, x, y, cropWidth, cropHeight, 0, 0, targetW, targetH);
    const imageData = sampleCtx.getImageData(0, 0, targetW, targetH).data;
    let total = 0;
    let count = 0;
    const gray = new Float32Array(targetW * targetH);
    for (let i = 0, p = 0; i < imageData.length; i += 4, p += 1) {
      gray[p] = imageData[i] * 0.299 + imageData[i + 1] * 0.587 + imageData[i + 2] * 0.114;
    }
    for (let yy = 1; yy < targetH - 1; yy += 1) {
      for (let xx = 1; xx < targetW - 1; xx += 1) {
        const idx = yy * targetW + xx;
        const gx = Math.abs(gray[idx + 1] - gray[idx - 1]);
        const gy = Math.abs(gray[idx + targetW] - gray[idx - targetW]);
        total += gx + gy;
        count += 1;
      }
    }
    return count ? total / count : 0;
  };

  const classifySharpness = (score) => {
    if (score >= 24) return { kind: 'ok', message: tr('cameraSharpnessGood') };
    if (score >= 15) return { kind: 'warn', message: tr('cameraSharpnessSoft') };
    return { kind: 'bad', message: tr('cameraSharpnessBlurry') };
  };

  const updateLiveSharpness = () => {
    if (!cameraVideo || !cameraCanvas || cameraVideo.readyState < 2) return;
    const width = cameraVideo.videoWidth || 1280;
    const height = cameraVideo.videoHeight || 720;
    cameraCanvas.width = width;
    cameraCanvas.height = height;
    const ctx = cameraCanvas.getContext('2d', { willReadFrequently: true });
    drawCurrentVideoFrame(ctx, width, height);
    const score = computeSharpnessScore(ctx, width, height);
    lastFocusScore = score;
    const state = classifySharpness(score);
    setFocusState(state.kind, state.message);
  };

  const closeCameraModal = () => {
    if (cameraModal) cameraModal.hidden = true;
    stopCameraStream();
    if (cameraVideo) cameraVideo.srcObject = null;
    if (cameraStatus) {
      cameraStatus.textContent = tr('cameraStart');
      cameraStatus.classList.remove('warn');
    }
    setFocusState('', tr('cameraSharpnessChecking'));
    updateStereoPreviewMode(false);
    lastFocusScore = null;
    cameraTargetInput = null;
  };

  const setInputFileFromBlob = async (input, blob) => {
    if (!input || !blob) return;
    const ext = blob.type === 'image/png' ? 'png' : 'jpg';
    const file = new File([blob], `${input.name}-${Date.now()}.${ext}`, { type: blob.type || 'image/jpeg' });
    const hiddenCameraField = hiddenCameraFieldFor(input.name);
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.readAsDataURL(file);
    });

    let assignedToNativeInput = false;
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      assignedToNativeInput = input.files && input.files.length > 0;
    } catch (_error) {
      assignedToNativeInput = false;
    }

    if (hiddenCameraField) hiddenCameraField.value = dataUrl || '';

    if (assignedToNativeInput) input.dispatchEvent(new Event('change', { bubbles: true }));
    else renderPreview(input, file, dataUrl);
  };

  const openCameraForInput = async (input) => {
    if (!cameraModal || !cameraVideo || !cameraCanvas || !cameraStatus) {
      input.click();
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraStatus.textContent = tr('cameraUnsupported');
      cameraModal.hidden = false;
      return;
    }

    cameraTargetInput = input;
    cameraModal.hidden = false;
    cameraStatus.textContent = tr('cameraConnecting');

    try {
      stopCameraStream();
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      } catch (_err) {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      cameraVideo.srcObject = cameraStream;
      await cameraVideo.play();
      const probeCanvas = document.createElement('canvas');
      const probeWidth = cameraVideo.videoWidth || 1280;
      const probeHeight = cameraVideo.videoHeight || 720;
      probeCanvas.width = probeWidth;
      probeCanvas.height = probeHeight;
      const probeCtx = probeCanvas.getContext('2d', { willReadFrequently: true });
      probeCtx.drawImage(cameraVideo, 0, 0, probeWidth, probeHeight);
      updateStereoPreviewMode(detectSplitStereoFeed(probeCtx, probeWidth, probeHeight));
      cameraStatus.textContent = tr('cameraReady');
      cameraStatus.classList.remove('warn');
      setFocusState('', tr('cameraSharpnessChecking'));
      updateLiveSharpness();
      focusInterval = window.setInterval(updateLiveSharpness, 900);
    } catch (_error) {
      cameraStatus.textContent = tr('cameraFailed');
      cameraStatus.classList.add('warn');
      setFocusState('bad', tr('cameraSharpnessBlurry'));
    }
  };

  document.querySelectorAll('[data-open-camera]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fieldName = btn.getAttribute('data-open-camera');
      const input = document.querySelector(`input[name="${fieldName}"]`);
      if (!input) return;
      openCameraForInput(input);
    });
  });

  document.querySelectorAll('[data-close-camera]').forEach((btn) => {
    btn.addEventListener('click', closeCameraModal);
  });

  const captureBtn = document.querySelector('[data-capture-camera]');
  if (captureBtn) {
    captureBtn.addEventListener('click', async () => {
      if (!cameraVideo || !cameraCanvas || !cameraTargetInput) return;
      const width = cameraVideo.videoWidth || 1280;
      const height = cameraVideo.videoHeight || 720;
      cameraCanvas.width = width;
      cameraCanvas.height = height;
      const ctx = cameraCanvas.getContext('2d', { willReadFrequently: true });
      drawCurrentVideoFrame(ctx, width, height);
      const score = computeSharpnessScore(ctx, width, height);
      lastFocusScore = score;
      const state = classifySharpness(score);
      setFocusState(state.kind, state.message);
      if (score < 15) {
        if (cameraStatus) {
          cameraStatus.textContent = tr('cameraRetakePrompt');
          cameraStatus.classList.add('warn');
        }
        return;
      }
      if (cameraStatus) cameraStatus.classList.remove('warn');
      cameraCanvas.toBlob(async (blob) => {
        if (!blob) {
          if (cameraStatus) {
            cameraStatus.textContent = tr('cameraCaptureFailed');
            cameraStatus.classList.add('warn');
          }
          return;
        }
        await setInputFileFromBlob(cameraTargetInput, blob);
        if (cameraStatus) cameraStatus.textContent = tr('cameraCaptureSuccess');
        setTimeout(closeCameraModal, 450);
      }, 'image/jpeg', 0.92);
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && cameraModal && !cameraModal.hidden) closeCameraModal();
  });
});
