function $(selector, root = document) { return root.querySelector(selector); }
function $all(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }

let projects = [];
let projectCategories = [];

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function slugify(text) {
  if (window.HossainSupabase && window.HossainSupabase.slugify) return window.HossainSupabase.slugify(text);
  return String(text || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'category';
}

function getProjectSortValue(project) {
  const value = project.scheduleDate || project.projectDate || project.date || project.year || '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value + 'T00:00:00').getTime();
  const monthMap = { january:0, february:1, march:2, april:3, may:4, june:5, july:6, august:7, september:8, october:9, november:10, december:11, jan:0, feb:1, mar:2, apr:3, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
  const text = String(value).toLowerCase();
  const years = Array.from(text.matchAll(/(20\d{2}|19\d{2})/g)).map(match => Number(match[1]));
  const year = years.length ? Math.max(...years) : 0;
  let month = 0;
  Object.keys(monthMap).forEach(name => { if (text.includes(name)) month = Math.max(month, monthMap[name]); });
  return year ? new Date(year, month, 1).getTime() : 0;
}

function sortProjectsNewestFirst(list) {
  return [...list].sort((a, b) => getProjectSortValue(b) - getProjectSortValue(a));
}

function getCategoryLabel(categoryId) {
  const found = projectCategories.find(item => item.id === categoryId);
  return found ? found.label : String(categoryId || 'Project');
}

function getAllCategories() {
  const map = new Map();
  projectCategories.forEach(category => {
    if (category && category.id) map.set(category.id, category.label || category.id);
  });
  projects.forEach(project => {
    const id = project.category || slugify(project.tag || 'project');
    if (id && !map.has(id)) map.set(id, project.tag || id);
  });
  return Array.from(map, ([id, label]) => ({ id, label }));
}

function projectLink(project) {
  return project.link || `project-detail.html?id=${encodeURIComponent(project.id || '')}`;
}

async function loadProjectData() {
  const fallbackProjects = Array.isArray(window.PROJECTS) ? window.PROJECTS : [];
  const fallbackCategories = Array.isArray(window.PROJECT_CATEGORIES) ? window.PROJECT_CATEGORIES : [];
  projects = fallbackProjects;
  projectCategories = fallbackCategories;

  if (window.HossainSupabase && window.HossainSupabase.hasConfig()) {
    try {
      const [dbCategories, dbProjects] = await Promise.all([
        window.HossainSupabase.fetchCategories(),
        window.HossainSupabase.fetchProjects({ includeUnpublished: false })
      ]);
      if (Array.isArray(dbCategories)) projectCategories = dbCategories;
      if (Array.isArray(dbProjects) && dbProjects.length) projects = dbProjects;
    } catch (error) {
      console.warn('Supabase project load failed. Using local fallback projects-data.js.', error);
    }
  }
}



let siteContent = window.SITE_CONTENT || {};

async function loadSiteContent() {
  siteContent = window.SITE_CONTENT || {};
  if (window.HossainSupabase && window.HossainSupabase.hasConfig() && window.HossainSupabase.fetchSiteContent) {
    try {
      const dbContent = await window.HossainSupabase.fetchSiteContent();
      if (dbContent && typeof dbContent === 'object') siteContent = dbContent;
    } catch (error) {
      console.warn('Supabase site content load failed. Using local site-content.js fallback.', error);
    }
  }
}

function setText(selector, value) {
  const el = $(selector);
  if (el && value !== undefined && value !== null) el.textContent = value;
}

function setHtml(selector, value) {
  const el = $(selector);
  if (el && value !== undefined && value !== null) el.innerHTML = value;
}

function updateLink(selector, text, href) {
  const el = $(selector);
  if (!el) return;
  if (text !== undefined && text !== null) el.textContent = text;
  if (href) el.setAttribute('href', href);
}

function safeList(value) {
  return Array.isArray(value) ? value : [];
}

function renderSelectOptions(selector, items, placeholder) {
  const select = $(selector);
  if (!select) return;
  select.innerHTML = [`<option value="">${escapeHtml(placeholder || 'Choose option')}</option>`, ...safeList(items).map(item => `<option>${escapeHtml(item)}</option>`)].join('');
}

function heroBackground(image) {
  const safe = image || 'assets/slide-1.png';
  return `linear-gradient(115deg,rgba(7,29,43,.55) 0%,rgba(7,29,43,.35) 48%,rgba(246,166,35,.10) 100%),url("${safe}") center/cover no-repeat`;
}

function renderSiteContent() {
  const c = siteContent || {};
  const general = c.general || {};
  const hero = c.hero || {};
  const trust = c.trust || {};
  const services = c.services || {};
  const about = c.about || {};
  const process = c.process || {};
  const projectsSection = c.projectsSection || {};
  const resume = c.resume || {};
  const faq = c.faq || {};
  const contact = c.contact || {};
  const footer = c.footer || {};

  if (general.siteTitle) document.title = general.siteTitle;
  setText('.brand-mark', general.brandMark || 'HA');
  $all('.brand-text').forEach(el => { if (general.brandName) el.textContent = general.brandName; });
  const topbar = $('.topbar-inner');
  if (topbar) {
    topbar.innerHTML = `
      <span>📍 ${escapeHtml(general.location || '')}</span>
      <span>✉️ ${escapeHtml(general.email || '')}</span>
      <span>📞 ${escapeHtml(general.phone || '')}</span>`;
  }
  updateLink('.nav-cta', general.quoteLabel || 'Get Quote', '#contact');

  setText('.hero-content .eyebrow', hero.eyebrow);
  setText('.hero-content h1', hero.title);
  setText('.hero-content p', hero.description);
  updateLink('.hero-actions .btn-primary', hero.primaryButtonText, hero.primaryButtonLink || '#projects');
  updateLink('.hero-actions .btn-light', hero.secondaryButtonText, hero.secondaryButtonLink || 'assets/Hossain_Ahmad_CV.pdf');
  $all('.hero-bg').forEach((el, index) => {
    const slide = safeList(hero.slides)[index];
    if (slide) el.style.background = heroBackground(slide);
  });
  const metrics = $('.hero-metrics');
  if (metrics && Array.isArray(hero.metrics)) {
    metrics.innerHTML = hero.metrics.map(item => {
      const value = escapeHtml(item.value || '0');
      const suffix = escapeHtml(item.suffix || '');
      return `<div><strong data-count="${value}" data-suffix="${suffix}">${value}${suffix}</strong><span>${escapeHtml(item.label || '')}</span></div>`;
    }).join('');
  }
  setText('.quote-card h3', hero.formTitle);
  setText('.quote-card p', hero.formText);
  renderSelectOptions('#quickForm select[name="service"]', hero.serviceOptions, 'Choose service');

  const strip = $('.strip-grid');
  if (strip && Array.isArray(trust.items)) strip.innerHTML = trust.items.map(item => `<span>${escapeHtml(item)}</span>`).join('');

  setText('#services .section-heading .eyebrow', services.eyebrow);
  setText('#services .section-heading h2', services.title);
  setText('#services .section-heading p', services.description);
  const servicesGrid = $('.services-grid');
  if (servicesGrid && Array.isArray(services.items)) {
    servicesGrid.innerHTML = services.items.map(item => `
      <article class="service-card reveal">
        <div class="service-icon">${escapeHtml(item.icon || '⚙️')}</div>
        <h3>${escapeHtml(item.title || '')}</h3>
        <p>${escapeHtml(item.description || '')}</p>
      </article>`).join('');
  }

  const aboutImg = $('.about-image');
  if (aboutImg && about.image) aboutImg.src = about.image;
  setText('.experience-badge strong', about.badgeNumber);
  setText('.experience-badge span', about.badgeText);
  setText('.about-content .eyebrow', about.eyebrow);
  setText('.about-content h2', about.title);
  const aboutPara = $('.about-content > p');
  if (aboutPara && about.description) aboutPara.textContent = about.description;
  const aboutList = $('.about-list');
  if (aboutList && Array.isArray(about.list)) {
    aboutList.innerHTML = about.list.map(item => {
      const parts = String(item).split(':');
      if (parts.length > 1) return `<div><strong>${escapeHtml(parts.shift())}:</strong>${escapeHtml(parts.join(':'))}</div>`;
      return `<div>${escapeHtml(item)}</div>`;
    }).join('');
  }
  updateLink('.about-content .btn', about.buttonText, about.buttonLink || '#resume');

  setText('.process-section .section-heading .eyebrow', process.eyebrow);
  setText('.process-section .section-heading h2', process.title);
  setText('.process-section .section-heading p', process.description);
  const processGrid = $('.process-grid');
  if (processGrid && Array.isArray(process.steps)) {
    processGrid.innerHTML = process.steps.map(step => `<div class="process-step reveal"><span>${escapeHtml(step.number || '')}</span><h3>${escapeHtml(step.title || '')}</h3><p>${escapeHtml(step.description || '')}</p></div>`).join('');
  }

  setText('.portfolio-header .eyebrow', projectsSection.eyebrow);
  setText('.portfolio-header h2', projectsSection.title);

  setText('.resume-card .eyebrow', resume.eyebrow);
  setText('.resume-card h2', resume.title);
  const resumePara = $('.resume-card p');
  if (resumePara && resume.snapshot) resumePara.textContent = resume.snapshot;
  updateLink('.resume-card .btn', resume.buttonText, resume.buttonLink || 'assets/Hossain_Ahmad_CV.pdf');
  const timeline = $('.timeline');
  if (timeline && Array.isArray(resume.timeline)) {
    timeline.innerHTML = resume.timeline.map(item => `<div class="timeline-item reveal"><span>${escapeHtml(item.period || '')}</span><h3>${escapeHtml(item.title || '')}</h3><p>${escapeHtml(item.description || '')}</p></div>`).join('');
  }

  setText('.faq-section .eyebrow', faq.eyebrow);
  setText('.faq-section h2', faq.title);
  const faqIntro = $('.faq-grid > .reveal p');
  if (faqIntro && faq.description) faqIntro.textContent = faq.description;
  const faqList = $('#faqList');
  if (faqList && Array.isArray(faq.items)) {
    faqList.innerHTML = faq.items.map((item, index) => `<div class="faq-item ${index === 0 ? 'active' : ''}"><button>${escapeHtml(item.question || '')}</button><p>${escapeHtml(item.answer || '')}</p></div>`).join('');
  }

  setText('.contact-info .eyebrow', contact.eyebrow);
  setText('.contact-info h2', contact.title);
  const contactPara = $('.contact-info > p');
  if (contactPara && contact.description) contactPara.textContent = contact.description;
  const cards = $('.contact-cards');
  if (cards) {
    cards.innerHTML = `
      <a href="mailto:${escapeHtml(contact.email || '')}">✉️ ${escapeHtml(contact.email || '')}</a>
      <a href="tel:${escapeHtml(String(contact.phone || '').replace(/\s+/g,''))}">📞 ${escapeHtml(contact.phone || '')}</a>
      <a href="${escapeHtml(contact.linkedin || '#')}" target="_blank" rel="noopener">🔗 LinkedIn Profile</a>
      <span>📍 ${escapeHtml(contact.location || '')}</span>`;
  }
  renderSelectOptions('#contactForm select[name="topic"]', contact.serviceOptions, 'Choose topic');
  setText('#formNote', contact.formNote);

  const footerP = $('.footer p');
  if (footerP && footer.tagline) footerP.textContent = footer.tagline;
  if (footer.copyrightName) {
    const copyright = $('.copyright');
    const year = new Date().getFullYear();
    if (copyright) copyright.innerHTML = `© <span id="year">${year}</span> ${escapeHtml(footer.copyrightName)}. All Rights Reserved.`;
  }

  showRevealElements();
}

function renderFilterButtons() {
  const filterControls = $('#filterControls');
  if (!filterControls) return;
  const categories = getAllCategories();
  filterControls.innerHTML = [
    '<button class="active" data-filter="all">All</button>',
    ...categories.map(category => `<button data-filter="${escapeHtml(category.id)}">${escapeHtml(category.label)}</button>`)
  ].join('');
}

function renderProjects(filter = 'all') {
  const projectGrid = $('#projectGrid');
  if (!projectGrid) return;
  const visibleProjects = sortProjectsNewestFirst(projects.filter(project => filter === 'all' || project.category === filter));

  if (!visibleProjects.length) {
    projectGrid.innerHTML = `<p class="project-empty">No projects found for this category.</p>`;
    return;
  }

  projectGrid.innerHTML = visibleProjects.map(project => {
    const link = projectLink(project);
    const categoryLabel = getCategoryLabel(project.category);
    return `
      <article class="project-card reveal" data-category="${escapeHtml(project.category)}" onclick="window.location.href='${escapeHtml(link)}'">
       <img 
  src="${escapeHtml(project.image || 'assets/project-structural.png')}" 
  alt="${escapeHtml(project.imageAlt || project.title)}" 
  loading="lazy"
>
        <div class="project-body">
          <span class="project-tag">${escapeHtml(categoryLabel)}</span>
          <h3>${escapeHtml(project.title)}</h3>
          <p>${escapeHtml(project.description)}</p>
          <div class="project-meta"><span>${escapeHtml(project.year)}</span><span>${escapeHtml(project.tag || categoryLabel)}</span></div>
        </div>
      </article>
    `;
  }).join('');
  showRevealElements();
}

let revealObserver = null;
function showRevealElements() {
  const revealItems = $all('.reveal:not(.show)');
  if (!revealItems.length) return;

  if (!('IntersectionObserver' in window)) {
    revealItems.forEach((el, index) => {
      el.style.setProperty('--reveal-delay', `${Math.min(index * 70, 500)}ms`);
      el.classList.add('show');
    });
    return;
  }

  if (!revealObserver) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  }

  revealItems.forEach((el, index) => {
    el.style.setProperty('--reveal-delay', `${Math.min(index * 70, 500)}ms`);
    revealObserver.observe(el);
  });
}

function initPremiumMotion() {
  if (!document.querySelector('.scroll-progress')) {
    const progress = document.createElement('div');
    progress.className = 'scroll-progress';
    document.body.appendChild(progress);
  }

  const progressBar = document.querySelector('.scroll-progress');
  const updateProgress = () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const percent = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
    if (progressBar) progressBar.style.width = `${percent}%`;
  };

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  const hero = document.querySelector('.hero-section');
  if (hero) {
    hero.addEventListener('mousemove', event => {
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      hero.style.setProperty('--mx', `${x}%`);
      hero.style.setProperty('--my', `${y}%`);
    });
  }

  document.querySelectorAll('.hero-section,.services-section,.about-section,.process-section,.projects-section,.resume-section,.faq-section,.contact-section,.footer').forEach(section => {
    if (section.querySelector('.motion-particle')) return;
    for (let i = 0; i < 4; i += 1) {
      const particle = document.createElement('span');
      particle.className = 'motion-particle';
      section.appendChild(particle);
    }
  });
}

function animateCounters() {
  const metricsSection = document.querySelector('.hero-metrics');
  const counters = $all('.hero-metrics [data-count]');

  if (!metricsSection || !counters.length) return;

  counters.forEach(counter => {
    const target = parseInt(counter.dataset.count, 10) || 0;
    const suffix = counter.dataset.suffix !== undefined ? counter.dataset.suffix : '+';

    counter.dataset.finalTarget = target;
    counter.dataset.finalSuffix = suffix;
    counter.textContent = '0' + suffix;
  });

  let hasCounted = false;

  function startCounter(counter, duration = 5200) {
    const target = parseInt(counter.dataset.finalTarget, 10) || 0;
    const suffix = counter.dataset.finalSuffix || '';
    let startTime = null;

    function updateCounter(now) {
      if (!startTime) startTime = now;

      const progress = Math.min((now - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const value = Math.floor(easedProgress * target);

      counter.textContent = value + suffix;

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        counter.textContent = target + suffix;
      }
    }

    requestAnimationFrame(updateCounter);
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !hasCounted) {
        hasCounted = true;

        counters.forEach(counter => {
          startCounter(counter, 5200);
        });

        observer.unobserve(metricsSection);
      }
    });
  }, {
    threshold: 0.65
  });

  observer.observe(metricsSection);
}

document.addEventListener('DOMContentLoaded', async () => {
  initPremiumMotion();
  const header = $('#siteHeader');
  const backToTop = $('#backToTop');
  function handleScroll(){
    if (header) header.classList.toggle('scrolled', window.scrollY > 80);
    if (backToTop) backToTop.classList.toggle('show', window.scrollY > 700);
  }
  window.addEventListener('scroll', handleScroll);
  handleScroll();
  if (backToTop) backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  const menuToggle = $('#menuToggle');
const navLinks = $('#navLinks');

if (menuToggle && navLinks) {
  const closeMenu = () => {
    navLinks.classList.remove('open');
    menuToggle.classList.remove('active');
  };

  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    navLinks.classList.toggle('open');
    menuToggle.classList.toggle('active');
  });

  $all('a', navLinks).forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  window.addEventListener('scroll', closeMenu, { passive: true });

  document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
      closeMenu();
    }
  });
}

  await loadSiteContent();
  renderSiteContent();

  const slides = $all('.hero-slide');
  let currentSlide = 0;
  function showSlide(index){
    if (!slides.length) return;
    slides[currentSlide].classList.remove('active');
    currentSlide = (index + slides.length) % slides.length;
    slides[currentSlide].classList.add('active');
  }
  const nextSlide = $('#nextSlide');
  const prevSlide = $('#prevSlide');
  if (nextSlide) nextSlide.addEventListener('click', () => showSlide(currentSlide + 1));
  if (prevSlide) prevSlide.addEventListener('click', () => showSlide(currentSlide - 1));
  if (slides.length > 1) setInterval(() => showSlide(currentSlide + 1), 6500);

  animateCounters();
  showRevealElements();
  await loadProjectData();
  renderFilterButtons();
  renderProjects();

  const filterControls = $('#filterControls');
  if (filterControls) {
    filterControls.addEventListener('click', event => {
      const button = event.target.closest('button');
      if(!button) return;
      $all('button', filterControls).forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      renderProjects(button.dataset.filter || 'all');
    });
  }

  const faqList = $('#faqList');
  if (faqList) {
    faqList.addEventListener('click', event => {
      const button = event.target.closest('button');
      if(!button) return;
      button.parentElement.classList.toggle('active');
    });
  }

  function setFormFeedback(form, message, isError = false) {
    let note = form.querySelector('.form-feedback');
    if (!note) {
      note = document.createElement('p');
      note.className = 'form-feedback';
      form.appendChild(note);
    }
    note.textContent = message;
    note.style.marginTop = '10px';
    note.style.fontSize = '.9rem';
    note.style.fontWeight = '800';
    note.style.color = isError ? '#b42318' : '#0b7a3b';
  }

  function getContactFormValues(form) {
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const service = String(data.get('service') || data.get('topic') || '').trim();
    const subject = String(data.get('subject') || `Project Inquiry - ${service || 'Website'}`).trim();
    const message = String(data.get('message') || '').trim();
    return { name, email, service, subject, message };
  }

  function setSubmitState(form, isSubmitting) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    if (isSubmitting) {
      button.dataset.originalText = button.textContent;
      button.textContent = 'Sending...';
      button.disabled = true;
      button.style.opacity = '0.75';
      button.style.cursor = 'not-allowed';
    } else {
      button.textContent = button.dataset.originalText || 'Send Message';
      button.disabled = false;
      button.style.opacity = '';
      button.style.cursor = '';
    }
  }

  async function sendWebsiteEmail(form) {
    const values = getContactFormValues(form);
    const accessKey = String(window.WEB3FORMS_ACCESS_KEY || '').trim();

    if (!accessKey || accessKey.includes('PASTE_')) {
      setFormFeedback(form, 'Email auto-send is not configured yet. Add your Web3Forms access key in supabase-config.js.', true);
      return;
    }

    const bodyText = `New project inquiry from portfolio website

Name: ${values.name}
Email: ${values.email}
Service/Topic: ${values.service}

Project Details:
${values.message}`;

    const formData = new FormData();
    formData.append('access_key', accessKey);
    formData.append('subject', values.subject || 'New Portfolio Project Inquiry');
    formData.append('from_name', values.name || 'Portfolio Website Visitor');
    formData.append('name', values.name);
    formData.append('email', values.email);
    formData.append('service', values.service);
    formData.append('message', bodyText);
    formData.append('botcheck', '');

    try {
      setSubmitState(form, true);
      setFormFeedback(form, 'Sending message...', false);

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success) {
        form.reset();
        setFormFeedback(form, 'Message sent successfully. I will contact you soon.', false);
      } else {
        setFormFeedback(form, result.message || 'Message could not be sent. Please try again.', true);
      }
    } catch (error) {
      console.error('Contact form send failed:', error);
      setFormFeedback(form, 'Network error. Please check internet connection and try again.', true);
    } finally {
      setSubmitState(form, false);
    }
  }

  const quickForm = $('#quickForm');
  const contactForm = $('#contactForm');
  if (quickForm) quickForm.addEventListener('submit', event => { event.preventDefault(); sendWebsiteEmail(event.currentTarget); });
  if (contactForm) contactForm.addEventListener('submit', event => { event.preventDefault(); sendWebsiteEmail(event.currentTarget); });

  const sections = $all('main section[id]');
  const navItems = $all('.nav-links a');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const top = section.offsetTop - 160;
      if(window.scrollY >= top) current = section.id;
    });
    navItems.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${current}`));
  });
});
