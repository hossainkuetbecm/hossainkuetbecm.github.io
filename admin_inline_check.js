
    const $ = (selector, root = document) => root.querySelector(selector);
    const $all = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    let projects = [];
    let categories = [];
    let selectedId = '';
    const undoStack = [];

    const els = {
      configError: $('#configError'), loginForm: $('#adminLoginForm'), loginError: $('#adminLoginError'), logoutBtn: $('#adminLogoutBtn'),
      statusBox: $('#statusBox'), projectList: $('#adminProjectList'), categoryList: $('#categoryList'), categorySelect: $('#category'),
      form: $('#projectForm'), newProjectBtn: $('#newProjectBtn'), deleteBtn: $('#deleteBtn'), undoBtn: $('#undoBtn'), reloadBtn: $('#reloadBtn'),
      addCategoryBtn: $('#addCategoryBtn'), newCategoryLabel: $('#newCategoryLabel'), newCategoryId: $('#newCategoryId'), importSeedBtn: $('#importSeedBtn'),
      previewImage: $('#previewImage'), previewTag: $('#previewTag'), previewTitle: $('#previewTitle'), previewDescription: $('#previewDescription'),
      imageUpload: $('#imageUpload'), uploadImageBtn: $('#uploadImageBtn'), clearImageBtn: $('#clearImageBtn'), imageDropZone: $('#imageDropZone'), uploadFileName: $('#uploadFileName'), uploadStatus: $('#uploadStatus'),
      uploadPreviewWrap: $('#uploadPreviewWrap'), localUploadPreview: $('#localUploadPreview'), uploadPreviewTitle: $('#uploadPreviewTitle'), uploadPreviewNote: $('#uploadPreviewNote'), uploadedUrlText: $('#uploadedUrlText'),
      galleryUpload: $('#galleryUpload'), uploadGalleryBtn: $('#uploadGalleryBtn'), clearGalleryBtn: $('#clearGalleryBtn'), galleryUploadStatus: $('#galleryUploadStatus'), galleryPreviewStrip: $('#galleryPreviewStrip')
    };

    function slugify(text) { return window.HossainSupabase.slugify(text); }
    function arr(value) { return window.HossainSupabase.toArray(value); }
    function today() { return new Date().toISOString().slice(0, 10); }
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function sortProjects(list) { return [...list].sort((a,b) => String(b.scheduleDate || '').localeCompare(String(a.scheduleDate || ''))); }
    function showStatus(message, type = 'success') {
      els.statusBox.className = `admin-alert ${type === 'error' ? 'admin-error' : 'admin-success'}`;
      els.statusBox.innerHTML = message;
      els.statusBox.classList.remove('hidden');
      setTimeout(() => els.statusBox.classList.add('hidden'), 6000);
    }

    function setLoginError(message) { els.loginError.textContent = message || ''; }


    let selectedUploadFile = null;
    let selectedUploadObjectUrl = '';

    function setUploadStatus(message = '', type = 'normal') {
      if (!els.uploadStatus) return;
      els.uploadStatus.textContent = message;
      els.uploadStatus.style.color = type === 'error' ? '#a51616' : (type === 'success' ? '#176735' : 'var(--muted)');
    }


    function setGalleryStatus(message = '', type = 'normal') {
      if (!els.galleryUploadStatus) return;
      els.galleryUploadStatus.textContent = message;
      els.galleryUploadStatus.style.color = type === 'error' ? '#a51616' : (type === 'success' ? '#176735' : 'var(--muted)');
    }

    function getGalleryUrls() {
      return linesToArray($('#galleryImages') ? $('#galleryImages').value : '');
    }

    function setGalleryUrls(urls) {
      const unique = Array.from(new Set((urls || []).map(url => String(url || '').trim()).filter(Boolean)));
      if ($('#galleryImages')) $('#galleryImages').value = unique.join('\n');
      renderGalleryPreview();
    }

    function renderGalleryPreview() {
      if (!els.galleryPreviewStrip) return;
      const urls = getGalleryUrls();
      els.galleryPreviewStrip.innerHTML = urls.slice(0, 12).map(url => `<img src="${url.replaceAll('"','&quot;')}" alt="Gallery preview" onerror="this.style.opacity=.25">`).join('');
      if (!urls.length) els.galleryPreviewStrip.innerHTML = '';
    }

    function previewSelectedGalleryFiles() {
      if (!els.galleryPreviewStrip || !els.galleryUpload) return;
      const files = Array.from(els.galleryUpload.files || []);
      if (!files.length) {
        renderGalleryPreview();
        setGalleryStatus('');
        return;
      }
      const previews = files.slice(0, 12).map(file => {
        const localUrl = URL.createObjectURL(file);
        setTimeout(() => URL.revokeObjectURL(localUrl), 15000);
        return `<img src="${localUrl}" alt="Selected gallery image preview">`;
      }).join('');
      els.galleryPreviewStrip.innerHTML = previews;
      setGalleryStatus(`${files.length} image(s) selected. Click Upload Gallery Images.`, 'success');
    }

    async function uploadGalleryImages() {
      const files = els.galleryUpload && els.galleryUpload.files ? Array.from(els.galleryUpload.files) : [];
      if (!files.length) {
        setGalleryStatus('Choose one or more gallery images first.', 'error');
        alert('Choose one or more gallery images first.');
        return;
      }

      if (!window.HossainSupabase || !window.HossainSupabase.hasConfig || !window.HossainSupabase.hasConfig()) {
        setGalleryStatus('Supabase config missing. Check supabase-config.js.', 'error');
        showStatus('Supabase config missing. Check <strong>supabase-config.js</strong>.', 'error');
        return;
      }

      const projectId = slugify($('#id').value.trim() || $('#title').value.trim() || 'project');
      if (!projectId) {
        setGalleryStatus('Write Project ID or Title first.', 'error');
        return;
      }

      try {
        els.uploadGalleryBtn.disabled = true;
        setGalleryStatus(`Uploading 0/${files.length} gallery image(s)...`);
        const uploaded = [];

        for (let i = 0; i < files.length; i += 1) {
          const file = files[i];
          const fileType = String(file.type || '').toLowerCase();
          const fileName = String(file.name || '').toLowerCase();
          const looksLikeImage = fileType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName);
          if (!looksLikeImage) throw new Error(`Gallery accepts image files only: ${file.name || 'unknown file'}`);
          if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name} is too large. Keep each image under 20 MB.`);

          setGalleryStatus(`Uploading ${i + 1}/${files.length}: ${file.name}`);
          const url = await window.HossainSupabase.uploadAdminFile(file, `projects/${projectId}/gallery`);
          uploaded.push(url);
        }

        setGalleryUrls([...getGalleryUrls(), ...uploaded]);
        if (els.galleryUpload) els.galleryUpload.value = '';
        setGalleryStatus(`Uploaded ${uploaded.length} gallery image(s). Now click Save Project to Database.`, 'success');
        showStatus('Gallery images uploaded. Click <strong>Save Project to Database</strong> to publish the image bundle.');
      } catch (error) {
        const message = error && error.message ? error.message : 'Gallery upload failed.';
        setGalleryStatus(message, 'error');
        showStatus(`${message}<br><br>If this is a Storage/RLS error, run <strong>RUN_THIS_FOR_ALL_UPLOAD_SYSTEM.sql</strong> with Role = postgres.`, 'error');
      } finally {
        els.uploadGalleryBtn.disabled = false;
      }
    }

    function setSelectedUploadFile(file) {
      selectedUploadFile = file || null;
      if (selectedUploadObjectUrl) {
        URL.revokeObjectURL(selectedUploadObjectUrl);
        selectedUploadObjectUrl = '';
      }

      if (els.uploadFileName) {
        els.uploadFileName.textContent = file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : 'No image selected.';
      }

      if (file) {
        selectedUploadObjectUrl = URL.createObjectURL(file);
        if (els.uploadPreviewWrap) els.uploadPreviewWrap.classList.add('show');
        if (els.localUploadPreview) els.localUploadPreview.src = selectedUploadObjectUrl;
        if (els.uploadPreviewTitle) els.uploadPreviewTitle.textContent = 'New image selected';
        if (els.uploadPreviewNote) els.uploadPreviewNote.textContent = 'Preview only. Click Upload Image, then Save Project to Database.';
        if (els.uploadedUrlText) els.uploadedUrlText.textContent = '';
        if (els.previewImage) {
          els.previewImage.src = selectedUploadObjectUrl;
          els.previewImage.alt = 'Selected local image preview - not saved yet';
        }
        setUploadStatus('Image selected. Click Upload Image to send it to Supabase Storage.', 'success');
      } else {
        if (els.uploadPreviewWrap) els.uploadPreviewWrap.classList.remove('show');
        if (els.localUploadPreview) els.localUploadPreview.removeAttribute('src');
        if (els.uploadedUrlText) els.uploadedUrlText.textContent = '';
        setUploadStatus('');
        updatePreview();
      }
    }

    async function uploadSelectedProjectImage() {
      const file = selectedUploadFile || (els.imageUpload && els.imageUpload.files && els.imageUpload.files[0]);
      if (!file) return alert('Choose an image first.');

      const projectId = slugify($('#id').value.trim() || $('#title').value.trim() || 'project');
      if (!projectId) return alert('Write project title or project ID first.');

      try {
        els.uploadImageBtn.disabled = true;
        setUploadStatus('Uploading image to Supabase Storage...');
        const publicUrl = await window.HossainSupabase.uploadProjectImage(file, projectId);
        $('#image').value = publicUrl;
        if (els.uploadPreviewWrap) els.uploadPreviewWrap.classList.add('show');
        if (els.localUploadPreview) els.localUploadPreview.src = publicUrl;
        if (els.uploadPreviewTitle) els.uploadPreviewTitle.textContent = 'Uploaded image';
        if (els.uploadPreviewNote) els.uploadPreviewNote.textContent = 'Upload complete. Now click Save Project to Database.';
        if (els.uploadedUrlText) els.uploadedUrlText.textContent = publicUrl;
        selectedUploadFile = null;
        if (els.imageUpload) els.imageUpload.value = '';
        updatePreview();
        setUploadStatus('Uploaded successfully. Image URL has been filled automatically.', 'success');
        showStatus('Image uploaded. Now click <strong>Save Project to Database</strong> to save this image with the project.');
      } catch (error) {
        setUploadStatus(error.message || 'Upload failed.', 'error');
        showStatus(error.message || 'Upload failed.', 'error');
      } finally {
        els.uploadImageBtn.disabled = false;
      }
    }



    let siteContent = clone(window.SITE_CONTENT || {});

    const contentEls = {
      loadBtn: $('#loadContentBtn'), saveBtn: $('#saveContentBtn'), tabs: $('#contentTabs'),
      siteImageUpload: $('#siteImageUpload'), siteImageTarget: $('#siteImageTarget'), uploadSiteImageBtn: $('#uploadSiteImageBtn'), siteImageUploadStatus: $('#siteImageUploadStatus'),
      universalFileUpload: $('#universalFileUpload'), universalUploadTarget: $('#universalUploadTarget'), universalUploadFolder: $('#universalUploadFolder'),
      universalUploadBtn: $('#universalUploadBtn'), universalUploadStatus: $('#universalUploadStatus'), universalUploadResult: $('#universalUploadResult'),
      universalUploadPreviewBox: $('#universalUploadPreviewBox'), universalUploadFileName: $('#universalUploadFileName'), universalUploadUrl: $('#universalUploadUrl'),
      copyUniversalUrlBtn: $('#copyUniversalUrlBtn'), openUniversalUrlBtn: $('#openUniversalUrlBtn')
    };

    function getValue(id) { const el = $('#' + id); return el ? el.value.trim() : ''; }
    function setValue(id, value) { const el = $('#' + id); if (el) el.value = value ?? ''; }
    function linesToArray(text) { return String(text || '').split('\n').map(item => item.trim()).filter(Boolean); }
    function arrayToLines(arr) { return Array.isArray(arr) ? arr.join('\n') : ''; }
    function pipeItemsToText(items, fields) {
      return Array.isArray(items) ? items.map(item => fields.map(field => item[field] ?? '').join('|')).join('\n') : '';
    }
    function textToPipeItems(text, fields) {
      return linesToArray(text).map(line => {
        const parts = line.split('|').map(part => part.trim());
        const obj = {};
        fields.forEach((field, index) => obj[field] = parts[index] || '');
        return obj;
      });
    }

    function fillContentForm(content) {
      const c = content || {};
      const general = c.general || {}, hero = c.hero || {}, trust = c.trust || {}, services = c.services || {}, about = c.about || {}, process = c.process || {}, projectsSection = c.projectsSection || {}, resume = c.resume || {}, faq = c.faq || {}, contact = c.contact || {}, footer = c.footer || {};
      setValue('contentSiteTitle', general.siteTitle);
      setValue('contentBrandName', general.brandName);
      setValue('contentBrandMark', general.brandMark);
      setValue('contentLocation', general.location);
      setValue('contentEmail', general.email);
      setValue('contentPhone', general.phone);
      setValue('contentTrustItems', arrayToLines(trust.items));

      setValue('contentHeroEyebrow', hero.eyebrow);
      setValue('contentHeroTitle', hero.title);
      setValue('contentHeroDescription', hero.description);
      setValue('contentHeroPrimaryText', hero.primaryButtonText);
      setValue('contentHeroPrimaryLink', hero.primaryButtonLink);
      setValue('contentHeroSecondaryText', hero.secondaryButtonText);
      setValue('contentHeroSecondaryLink', hero.secondaryButtonLink);
      setValue('contentHeroFormTitle', hero.formTitle);
      setValue('contentHeroFormText', hero.formText);
      setValue('contentHeroSlides', arrayToLines(hero.slides));
      setValue('contentHeroMetrics', pipeItemsToText(hero.metrics, ['value','suffix','label']));
      setValue('contentHeroServiceOptions', arrayToLines(hero.serviceOptions));

      setValue('contentServicesEyebrow', services.eyebrow);
      setValue('contentServicesTitle', services.title);
      setValue('contentServicesDescription', services.description);
      setValue('contentServicesItems', pipeItemsToText(services.items, ['icon','title','description']));

      setValue('contentAboutEyebrow', about.eyebrow);
      setValue('contentAboutTitle', about.title);
      setValue('contentAboutImage', about.image);
      setValue('contentAboutBadgeNumber', about.badgeNumber);
      setValue('contentAboutBadgeText', about.badgeText);
      setValue('contentAboutDescription', about.description);
      setValue('contentAboutList', arrayToLines(about.list));

      setValue('contentProcessEyebrow', process.eyebrow);
      setValue('contentProcessTitle', process.title);
      setValue('contentProcessDescription', process.description);
      setValue('contentProcessSteps', pipeItemsToText(process.steps, ['number','title','description']));

      setValue('contentProjectsEyebrow', projectsSection.eyebrow);
      setValue('contentProjectsTitle', projectsSection.title);

      setValue('contentResumeEyebrow', resume.eyebrow);
      setValue('contentResumeTitle', resume.title);
      setValue('contentResumeSnapshot', resume.snapshot);
      setValue('contentResumeButtonText', resume.buttonText);
      setValue('contentResumeButtonLink', resume.buttonLink);
      setValue('contentResumeTimeline', pipeItemsToText(resume.timeline, ['period','title','description']));

      setValue('contentFaqEyebrow', faq.eyebrow);
      setValue('contentFaqTitle', faq.title);
      setValue('contentFaqDescription', faq.description);
      setValue('contentFaqItems', pipeItemsToText(faq.items, ['question','answer']));

      setValue('contentContactEyebrow', contact.eyebrow);
      setValue('contentContactTitle', contact.title);
      setValue('contentContactDescription', contact.description);
      setValue('contentContactEmail', contact.email);
      setValue('contentContactPhone', contact.phone);
      setValue('contentContactLinkedin', contact.linkedin);
      setValue('contentContactLocation', contact.location);
      setValue('contentContactServiceOptions', arrayToLines(contact.serviceOptions));
      setValue('contentContactFormNote', contact.formNote);
      setValue('contentFooterTagline', footer.tagline);
      setValue('contentFooterName', footer.copyrightName);
    }

    function readContentForm() {
      return {
        general: {
          siteTitle: getValue('contentSiteTitle'), brandName: getValue('contentBrandName'), brandMark: getValue('contentBrandMark'),
          location: getValue('contentLocation'), email: getValue('contentEmail'), phone: getValue('contentPhone'), adminLabel: 'Admin', quoteLabel: 'Get Quote'
        },
        hero: {
          eyebrow: getValue('contentHeroEyebrow'), title: getValue('contentHeroTitle'), description: getValue('contentHeroDescription'),
          primaryButtonText: getValue('contentHeroPrimaryText'), primaryButtonLink: getValue('contentHeroPrimaryLink'),
          secondaryButtonText: getValue('contentHeroSecondaryText'), secondaryButtonLink: getValue('contentHeroSecondaryLink'),
          slides: linesToArray(getValue('contentHeroSlides')), metrics: textToPipeItems(getValue('contentHeroMetrics'), ['value','suffix','label']),
          formTitle: getValue('contentHeroFormTitle'), formText: getValue('contentHeroFormText'), serviceOptions: linesToArray(getValue('contentHeroServiceOptions'))
        },
        trust: { items: linesToArray(getValue('contentTrustItems')) },
        services: { eyebrow: getValue('contentServicesEyebrow'), title: getValue('contentServicesTitle'), description: getValue('contentServicesDescription'), items: textToPipeItems(getValue('contentServicesItems'), ['icon','title','description']) },
        about: { eyebrow: getValue('contentAboutEyebrow'), title: getValue('contentAboutTitle'), image: getValue('contentAboutImage'), badgeNumber: getValue('contentAboutBadgeNumber'), badgeText: getValue('contentAboutBadgeText'), description: getValue('contentAboutDescription'), list: linesToArray(getValue('contentAboutList')), buttonText:'View Resume', buttonLink:'#resume' },
        process: { eyebrow: getValue('contentProcessEyebrow'), title: getValue('contentProcessTitle'), description: getValue('contentProcessDescription'), steps: textToPipeItems(getValue('contentProcessSteps'), ['number','title','description']) },
        projectsSection: { eyebrow: getValue('contentProjectsEyebrow'), title: getValue('contentProjectsTitle') },
        resume: { eyebrow: getValue('contentResumeEyebrow'), title: getValue('contentResumeTitle'), snapshot: getValue('contentResumeSnapshot'), buttonText: getValue('contentResumeButtonText'), buttonLink: getValue('contentResumeButtonLink'), timeline: textToPipeItems(getValue('contentResumeTimeline'), ['period','title','description']) },
        faq: { eyebrow: getValue('contentFaqEyebrow'), title: getValue('contentFaqTitle'), description: getValue('contentFaqDescription'), items: textToPipeItems(getValue('contentFaqItems'), ['question','answer']) },
        contact: { eyebrow: getValue('contentContactEyebrow'), title: getValue('contentContactTitle'), description: getValue('contentContactDescription'), email: getValue('contentContactEmail'), phone: getValue('contentContactPhone'), linkedin: getValue('contentContactLinkedin'), location: getValue('contentContactLocation'), serviceOptions: linesToArray(getValue('contentContactServiceOptions')), formNote: getValue('contentContactFormNote') },
        footer: { tagline: getValue('contentFooterTagline'), copyrightName: getValue('contentFooterName') }
      };
    }

    async function loadSiteContentAdmin() {
      siteContent = clone(window.SITE_CONTENT || {});
      try {
        if (window.HossainSupabase.fetchSiteContent) {
          const dbContent = await window.HossainSupabase.fetchSiteContent();
          if (dbContent) siteContent = dbContent;
        }
      } catch (error) {
        showStatus('Website content table not ready. Run RUN_THIS_FOR_COMPLETE_ADMIN.sql in Supabase SQL Editor first. Using local fallback.', 'error');
      }
      fillContentForm(siteContent);
    }

    async function saveSiteContentAdmin() {
      try {
        const content = readContentForm();
        if (!window.HossainSupabase.saveSiteContent) throw new Error('Supabase client is missing saveSiteContent().');
        siteContent = await window.HossainSupabase.saveSiteContent(content);
        fillContentForm(siteContent);
        showStatus('Full website content saved to Supabase. Refresh index.html with Ctrl+F5 to see changes.');
      } catch (error) {
        showStatus(error.message || 'Could not save website content.', 'error');
      }
    }

    let lastFocusedEditable = null;
    document.addEventListener('focusin', event => {
      const el = event.target;
      if (el && (el.matches('input[type="text"], input[type="url"], input:not([type]), textarea') || el.matches('#image, #contentAboutImage, #contentHeroSecondaryLink, #contentResumeButtonLink'))) {
        lastFocusedEditable = el;
      }
    });

    function setHeroSlideUrl(index, url) {
      const slides = linesToArray(getValue('contentHeroSlides'));
      while (slides.length < 3) slides.push('');
      slides[index] = url;
      setValue('contentHeroSlides', arrayToLines(slides));
    }

    function insertUrlIntoActiveField(url) {
      const el = lastFocusedEditable;
      if (!el) {
        if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
        return 'No active field selected. URL copied if clipboard is allowed.';
      }
      if (el.tagName === 'TEXTAREA') {
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const prefix = el.value.slice(0, start);
        const suffix = el.value.slice(end);
        const spacer = prefix && !prefix.endsWith('\n') ? '\n' : '';
        el.value = prefix + spacer + url + suffix;
      } else {
        el.value = url;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return 'Uploaded URL placed into the selected field.';
    }

    function applyUploadedUrl(target, url) {
      if (target === 'hero1') { setHeroSlideUrl(0, url); return 'Hero Slide 1 updated.'; }
      if (target === 'hero2') { setHeroSlideUrl(1, url); return 'Hero Slide 2 updated.'; }
      if (target === 'hero3') { setHeroSlideUrl(2, url); return 'Hero Slide 3 updated.'; }
      if (target === 'about') { setValue('contentAboutImage', url); return 'About/Profile image updated.'; }
      if (target === 'heroCv') { setValue('contentHeroSecondaryLink', url); return 'Hero CV/download link updated.'; }
      if (target === 'resumeCv') { setValue('contentResumeButtonLink', url); return 'Resume CV file link updated.'; }
      if (target === 'projectImage') { $('#image').value = url; updatePreview(); return 'Selected project main image updated.'; }
      if (target === 'projectGallery') { setGalleryUrls([...getGalleryUrls(), url]); return 'Uploaded URL added to selected project image bundle.'; }
      if (target === 'active') return insertUrlIntoActiveField(url);
      return 'Uploaded. Copy URL or open it from below.';
    }

    async function uploadUniversalAdminFile() {
      const file = contentEls.universalFileUpload && contentEls.universalFileUpload.files && contentEls.universalFileUpload.files[0];
      if (!file) return alert('Choose a file first.');
      try {
        contentEls.universalUploadBtn.disabled = true;
        contentEls.universalUploadStatus.textContent = 'Uploading file to Supabase Storage...';
        const folder = contentEls.universalUploadFolder.value || 'website-files';
        const url = await window.HossainSupabase.uploadAdminFile(file, folder);
        const target = contentEls.universalUploadTarget.value || 'copyOnly';
        const appliedMessage = applyUploadedUrl(target, url);

        if (contentEls.universalUploadResult) contentEls.universalUploadResult.classList.add('show');
        if (contentEls.universalUploadFileName) contentEls.universalUploadFileName.textContent = file.name;
        if (contentEls.universalUploadUrl) contentEls.universalUploadUrl.textContent = url;
        if (contentEls.openUniversalUrlBtn) contentEls.openUniversalUrlBtn.href = url;
        if (contentEls.universalUploadPreviewBox) {
          if (String(file.type || '').startsWith('image/')) {
            contentEls.universalUploadPreviewBox.className = '';
            contentEls.universalUploadPreviewBox.innerHTML = `<img src="${url}" alt="Uploaded preview" style="width:130px;height:86px;object-fit:cover;border-radius:12px;background:#edf2f6;">`;
          } else {
            contentEls.universalUploadPreviewBox.className = 'file-icon';
            contentEls.universalUploadPreviewBox.textContent = (file.name.split('.').pop() || 'FILE').toUpperCase();
          }
        }
        contentEls.universalUploadStatus.textContent = appliedMessage + ' Now save the related section/database.';
        showStatus(appliedMessage + ' Save the related section/database to publish.');
      } catch (error) {
        contentEls.universalUploadStatus.textContent = error.message || 'Upload failed.';
        showStatus(error.message || 'Upload failed.', 'error');
      } finally {
        contentEls.universalUploadBtn.disabled = false;
        if (contentEls.universalFileUpload) contentEls.universalFileUpload.value = '';
      }
    }

    async function uploadSelectedSiteImage() {
      const input = contentEls.siteImageUpload;
      const file = input && input.files && input.files[0];
      if (!file) return alert('Choose an image first.');
      try {
        contentEls.uploadSiteImageBtn.disabled = true;
        contentEls.siteImageUploadStatus.textContent = 'Uploading site image...';
        const target = contentEls.siteImageTarget.value;
        const url = await window.HossainSupabase.uploadAdminFile(file, 'site-' + target);
        const slides = linesToArray(getValue('contentHeroSlides'));
        if (target === 'about') setValue('contentAboutImage', url);
        else {
          const index = target === 'hero1' ? 0 : (target === 'hero2' ? 1 : 2);
          while (slides.length < 3) slides.push('');
          slides[index] = url;
          setValue('contentHeroSlides', arrayToLines(slides));
        }
        contentEls.siteImageUploadStatus.textContent = 'Image uploaded. Now click Save Full Website Content.';
        showStatus('Site image uploaded. Click Save Full Website Content to publish this URL.');
      } catch (error) {
        contentEls.siteImageUploadStatus.textContent = error.message || 'Upload failed.';
        showStatus(error.message || 'Upload failed.', 'error');
      } finally {
        contentEls.uploadSiteImageBtn.disabled = false;
        if (input) input.value = '';
      }
    }

    if (contentEls.tabs) {
      contentEls.tabs.addEventListener('click', event => {
        const button = event.target.closest('button[data-panel]');
        if (!button) return;
        $all('#contentTabs button').forEach(btn => btn.classList.remove('active'));
        $all('.content-panel').forEach(panel => panel.classList.remove('active'));
        button.classList.add('active');
        const panel = $('#' + button.dataset.panel);
        if (panel) panel.classList.add('active');
      });
    }
    if (contentEls.loadBtn) contentEls.loadBtn.addEventListener('click', async () => { await loadSiteContentAdmin(); showStatus('Website content reloaded.'); });
    if (contentEls.saveBtn) contentEls.saveBtn.addEventListener('click', saveSiteContentAdmin);
    if (contentEls.uploadSiteImageBtn) contentEls.uploadSiteImageBtn.addEventListener('click', uploadSelectedSiteImage);
    if (contentEls.universalUploadBtn) contentEls.universalUploadBtn.addEventListener('click', uploadUniversalAdminFile);
    if (contentEls.copyUniversalUrlBtn) contentEls.copyUniversalUrlBtn.addEventListener('click', async () => {
      const url = contentEls.universalUploadUrl ? contentEls.universalUploadUrl.textContent : '';
      if (!url) return;
      try { await navigator.clipboard.writeText(url); showStatus('Uploaded URL copied.'); } catch (e) { alert(url); }
    });

    async function requireAdminSession() {
      if (!window.HossainSupabase || !window.HossainSupabase.hasConfig()) {
        els.configError.classList.remove('hidden');
        return false;
      }
      const admin = await window.HossainSupabase.isAdminUser();
      if (admin) {
        document.body.classList.remove('admin-locked');
        await loadData();
        return true;
      }
      document.body.classList.add('admin-locked');
      return false;
    }

    els.loginForm.addEventListener('submit', async event => {
      event.preventDefault();
      setLoginError('');
      try {
        await window.HossainSupabase.signIn($('#adminEmail').value.trim(), $('#adminPassword').value);
        const admin = await window.HossainSupabase.isAdminUser();
        if (!admin) {
          await window.HossainSupabase.signOut();
          setLoginError('Login successful, but this user is not in admin_users table. Add this user as admin in Supabase SQL.');
          return;
        }
        document.body.classList.remove('admin-locked');
        await loadData();
      } catch (error) {
        setLoginError(error.message || 'Login failed.');
      }
    });

    els.logoutBtn.addEventListener('click', async () => {
      await window.HossainSupabase.signOut();
      document.body.classList.add('admin-locked');
    });

    async function loadData() {
      await loadSiteContentAdmin();
      categories = await window.HossainSupabase.fetchCategories() || [];
      projects = await window.HossainSupabase.fetchProjects({ includeUnpublished: true }) || [];
      renderCategories();
      renderCategorySelect();
      renderProjectList();
      if (projects.length) selectProject(projects[0].id); else newProject();
    }

    function renderCategories() {
      els.categoryList.innerHTML = categories.map(category => `
        <div class="category-row">
          <button type="button"><strong>${category.label}</strong><br><small>${category.id}</small></button>
          <button class="admin-btn danger small" type="button" data-delete-category="${category.id}">Delete</button>
        </div>
      `).join('') || '<p>No categories yet.</p>';
    }

    function renderCategorySelect() {
      els.categorySelect.innerHTML = categories.map(category => `<option value="${category.id}">${category.label}</option>`).join('');
    }

    function renderProjectList() {
      const sorted = sortProjects(projects);
      els.projectList.innerHTML = sorted.map(project => `
        <button type="button" data-id="${project.id}" class="${project.id === selectedId ? 'active' : ''}">
          ${project.isPublished === false ? '🔒 ' : ''}${project.title}<br>
          <small>${project.year || ''} • ${project.scheduleDate || 'No sort date'}</small>
        </button>
      `).join('') || '<p>No project yet. Use Import Seed Data or + New Project.</p>';
    }

    function selectProject(id) {
      selectedId = id;
      const project = projects.find(item => item.id === id);
      if (!project) return;
      fillForm(project);
      renderProjectList();
    }

    function fillForm(project) {
      $('#id').value = project.id || '';
      $('#title').value = project.title || '';
      $('#tag').value = project.tag || '';
      $('#category').value = project.category || (categories[0] && categories[0].id) || '';
      $('#yearField').value = project.year || '';
      $('#scheduleDate').value = project.scheduleDate || '';
      $('#image').value = project.image || '';
      $('#galleryImages').value = (project.galleryImages || project.gallery_images || []).join('\n');
      renderGalleryPreview();
      $('#description').value = project.description || '';
      $('#location').value = project.location || '';
      $('#client').value = project.client || '';
      $('#role').value = project.role || '';
      $('#overview').value = project.overview || '';
      $('#responsibilities').value = (project.responsibilities || []).join('\n');
      $('#deliverables').value = (project.deliverables || []).join('\n');
      $('#tools').value = (project.tools || []).join('\n');
      $('#isPublished').checked = project.isPublished !== false;
      selectedUploadFile = null;
      if (selectedUploadObjectUrl) {
        URL.revokeObjectURL(selectedUploadObjectUrl);
        selectedUploadObjectUrl = '';
      }
      if (els.imageUpload) els.imageUpload.value = '';
      if (els.uploadFileName) els.uploadFileName.textContent = 'No image selected.';
      if (els.uploadPreviewWrap) els.uploadPreviewWrap.classList.remove('show');
      if (els.uploadedUrlText) els.uploadedUrlText.textContent = '';
      setUploadStatus('');
      updatePreview();
    }

    function readForm() {
      const title = $('#title').value.trim();
      const id = slugify($('#id').value.trim() || title);
      return {
        id, title,
        tag: $('#tag').value.trim() || 'Project',
        category: $('#category').value,
        year: $('#yearField').value.trim(),
        scheduleDate: $('#scheduleDate').value || today(),
        image: $('#image').value.trim(),
        galleryImages: linesToArray($('#galleryImages').value),
        description: $('#description').value.trim(),
        location: $('#location').value.trim(),
        client: $('#client').value.trim(),
        role: $('#role').value.trim(),
        overview: $('#overview').value.trim(),
        responsibilities: arr($('#responsibilities').value),
        deliverables: arr($('#deliverables').value),
        tools: arr($('#tools').value),
        isPublished: $('#isPublished').checked
      };
    }

    function newProject() {
      selectedId = '';
      fillForm({ id:'', title:'', tag:'Project', category:(categories[0] && categories[0].id) || '', year:new Date().getFullYear(), scheduleDate:today(), image:'', galleryImages:[], description:'', responsibilities:[], deliverables:[], tools:[], isPublished:true });
      renderProjectList();
    }

    function updatePreview() {
      const imageUrl = $('#image').value.trim();
      if (selectedUploadObjectUrl && !imageUrl) {
        els.previewImage.src = selectedUploadObjectUrl;
        els.previewImage.alt = 'Selected local image preview - not saved yet';
      } else {
        els.previewImage.src = imageUrl || 'assets/project-structural.png';
        els.previewImage.alt = imageUrl ? 'Project image preview' : 'Default preview only - no image saved';
      }
      els.previewImage.onerror = function () {
        this.onerror = null;
        this.src = 'assets/project-structural.png';
        setUploadStatus('Image URL could not load. Check bucket policy or image path.', 'error');
      };
      els.previewTag.textContent = $('#tag').value.trim() || 'Project';
      els.previewTitle.textContent = $('#title').value.trim() || 'Project title';
      els.previewDescription.textContent = $('#description').value.trim() || 'Short description preview.';
    }

    async function pushUndoSnapshot() {
      undoStack.push({ projects: clone(projects), categories: clone(categories) });
      if (undoStack.length > 20) undoStack.shift();
      els.undoBtn.disabled = false;
    }

    async function restoreSnapshot(snapshot) {
      const currentProjects = await window.HossainSupabase.fetchProjects({ includeUnpublished: true }) || [];
      const currentCategories = await window.HossainSupabase.fetchCategories() || [];
      for (const category of snapshot.categories) await window.HossainSupabase.upsertCategory(category);
      for (const project of currentProjects) {
        if (!snapshot.projects.some(item => item.id === project.id)) await window.HossainSupabase.deleteProject(project.id);
      }
      for (const project of snapshot.projects) await window.HossainSupabase.upsertProject(project);
      for (const category of currentCategories) {
        if (!snapshot.categories.some(item => item.id === category.id)) {
          try { await window.HossainSupabase.deleteCategory(category.id); } catch (_) {}
        }
      }
      await loadData();
    }

    els.projectList.addEventListener('click', event => {
      const button = event.target.closest('button[data-id]');
      if (button) selectProject(button.dataset.id);
    });

    els.categoryList.addEventListener('click', async event => {
      const button = event.target.closest('[data-delete-category]');
      if (!button) return;
      const id = button.dataset.deleteCategory;
      if (!confirm(`Delete category "${id}"? It will fail if any project still uses it.`)) return;
      try {
        await pushUndoSnapshot();
        await window.HossainSupabase.deleteCategory(id);
        await loadData();
        showStatus('Category deleted.');
      } catch (error) {
        showStatus(error.message, 'error');
      }
    });

    els.form.addEventListener('input', updatePreview);


    if (els.imageUpload) {
      els.imageUpload.addEventListener('change', () => {
        setSelectedUploadFile(els.imageUpload.files && els.imageUpload.files[0]);
      });
    }

    if (els.uploadImageBtn) {
      els.uploadImageBtn.addEventListener('click', uploadSelectedProjectImage);
    }

    if (els.clearImageBtn) {
      els.clearImageBtn.addEventListener('click', () => {
        if (els.imageUpload) els.imageUpload.value = '';
        setSelectedUploadFile(null);
        $('#image').value = '';
        updatePreview();
        setUploadStatus('Image path cleared. Click Save Project to Database to remove/change the saved image.', 'success');
      });
    }


    if (els.galleryUpload) {
      els.galleryUpload.addEventListener('change', previewSelectedGalleryFiles);
    }

    if (els.galleryUploadBtn) {
      els.galleryUploadBtn.addEventListener('click', uploadGalleryImages);
    }

    if (els.clearGalleryBtn) {
      els.clearGalleryBtn.addEventListener('click', () => {
        setGalleryUrls([]);
        if (els.galleryUpload) els.galleryUpload.value = '';
        setGalleryStatus('Gallery cleared. Click Save Project to Database to remove saved gallery images.', 'success');
      });
    }

    if ($('#galleryImages')) {
      $('#galleryImages').addEventListener('input', renderGalleryPreview);
    }

    if (els.imageDropZone) {
      ['dragenter', 'dragover'].forEach(name => {
        els.imageDropZone.addEventListener(name, event => {
          event.preventDefault();
          els.imageDropZone.classList.add('dragover');
        });
      });
      ['dragleave', 'drop'].forEach(name => {
        els.imageDropZone.addEventListener(name, event => {
          event.preventDefault();
          els.imageDropZone.classList.remove('dragover');
        });
      });
      els.imageDropZone.addEventListener('drop', event => {
        const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
        if (file) setSelectedUploadFile(file);
      });
    }

    els.form.addEventListener('submit', async event => {
      event.preventDefault();
      try {
        await pushUndoSnapshot();
        const project = readForm();
        await window.HossainSupabase.upsertProject(project);
        selectedId = project.id;
        await loadData();
        selectProject(project.id);
        showStatus('Project saved to Supabase database.');
      } catch (error) {
        showStatus(error.message, 'error');
      }
    });

    els.newProjectBtn.addEventListener('click', newProject);

    els.deleteBtn.addEventListener('click', async () => {
      if (!selectedId) return alert('Select a project first.');
      if (!confirm('Delete selected project from database?')) return;
      try {
        await pushUndoSnapshot();
        await window.HossainSupabase.deleteProject(selectedId);
        selectedId = '';
        await loadData();
        showStatus('Project deleted.');
      } catch (error) {
        showStatus(error.message, 'error');
      }
    });

    els.undoBtn.addEventListener('click', async () => {
      const snapshot = undoStack.pop();
      if (!snapshot) return;
      try {
        await restoreSnapshot(snapshot);
        els.undoBtn.disabled = undoStack.length === 0;
        showStatus('Last database change undone.');
      } catch (error) {
        showStatus(error.message, 'error');
      }
    });

    els.reloadBtn.addEventListener('click', async () => {
      await loadData();
      showStatus('Reloaded from Supabase.');
    });

    els.addCategoryBtn.addEventListener('click', async () => {
      const label = els.newCategoryLabel.value.trim();
      const id = slugify(els.newCategoryId.value.trim() || label);
      if (!label) return alert('Write category name first.');
      try {
        await pushUndoSnapshot();
        await window.HossainSupabase.upsertCategory({ id, label, sortOrder: categories.length + 1 });
        els.newCategoryLabel.value = '';
        els.newCategoryId.value = '';
        await loadData();
        showStatus('Category added.');
      } catch (error) {
        showStatus(error.message, 'error');
      }
    });

    els.importSeedBtn.addEventListener('click', async () => {
      if (!confirm('Import the default projects-data.js items into Supabase? Existing same IDs will be updated.')) return;
      try {
        await pushUndoSnapshot();
        const seedCategories = Array.isArray(window.PROJECT_CATEGORIES) ? window.PROJECT_CATEGORIES : [];
        const seedProjects = Array.isArray(window.PROJECTS) ? window.PROJECTS : [];
        for (const category of seedCategories) await window.HossainSupabase.upsertCategory(category);
        for (const project of seedProjects) await window.HossainSupabase.upsertProject(project);
        await loadData();
        showStatus('Seed projects imported to Supabase.');
      } catch (error) {
        showStatus(error.message, 'error');
      }
    });

    requireAdminSession();
  