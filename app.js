/**
 * BREACHMATRIX — Master Application Script
 * Features:
 * - Slide Deck Navigation (1:1 with business portfolio template)
 * - Seamless Mode Switching (Slide Deck vs Scroll Website)
 * - Keyboard Shortcuts & Touch Swipe Gestures
 * - Retro Tactical Web Audio API Sound FX
 * - Secure Dispatch Modal & Interactive Transmission
 */

// ======================================================================
// BREACHMATRIX SUSPENSE LOADER (INITIAL LOAD HOOK)
// ======================================================================
(function initSuspensePreloader() {
  function getPreloader() {
    return document.getElementById('bm-preloader');
  }

  const startTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  const MIN_DISPLAY_MS = 1200; // allow smooth logo cycle and suspense feel without sudden flash
  let dismissed = false;

  function dismiss() {
    if (dismissed) return;
    dismissed = true;

    const preloader = getPreloader();
    if (!preloader) {
      document.documentElement.classList.remove('bm-loading-locked');
      return;
    }

    const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const elapsed = now - startTime;
    const delay = Math.max(0, MIN_DISPLAY_MS - elapsed);

    setTimeout(() => {
      preloader.classList.add('is-dismissed');
      document.documentElement.classList.remove('bm-loading-locked');

      setTimeout(() => {
        if (preloader.parentNode) {
          preloader.parentNode.removeChild(preloader);
        }
      }, 700);
    }, delay);
  }

  // Lock scrolling while suspense preloader is active
  if (getPreloader()) {
    document.documentElement.classList.add('bm-loading-locked');
  }

  // Wait for all page components, stylesheets, and assets to finish loading
  if (document.readyState === 'complete') {
    dismiss();
  } else {
    window.addEventListener('load', dismiss, { once: true });
    // Safety fallback timeout: 3.5s maximum wait
    setTimeout(dismiss, 3500);
  }
})();

  // Application State
let currentSlideIndex = 0;
const totalSlides = 4;
let isScrollMode = true;
let audioEnabled = false;

  // Audio Context(Web Audio API Synthesizer)
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
}

function playTacticalBlip(freq = 880, duration = 0.04, type = 'sine') {
  if (!audioEnabled || !audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn('Audio playback error', e);
  }
}

  // Slide Navigation
function goToSlide(index) {
  if (index < 0 || index >= totalSlides) return;
  currentSlideIndex = index;

  if (isScrollMode) {
      // Scroll mode: smooth scroll to section
    const scrollMap = {
      0: 'scroll-sec-0',
      1: 'scroll-sec-why',
      2: 'scroll-sec-future',
      3: 'scroll-sec-4'
    };
    const targetSec = document.getElementById(scrollMap[index] || `scroll-sec-${index}`);
    if (targetSec) {
      targetSec.scrollIntoView({ behavior: 'smooth' });
    }
  } else {
      // Deck mode: switch active slide
    const slides = document.querySelectorAll('.deck-slide');
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === currentSlideIndex);
    });

      // Update Counter
    const numDisplay = document.getElementById('current-slide-num');
    if (numDisplay) {
      numDisplay.textContent = String(currentSlideIndex + 1).padStart(2, '0');
    }

      // Update Thumbnails
    const thumbs = document.querySelectorAll('.thumb-btn');
    thumbs.forEach((thumb, i) => {
      thumb.classList.toggle('active', i === currentSlideIndex);
    });

      // Update Top Nav
    const navLinks = document.querySelectorAll('.top-nav .nav-link');
    navLinks.forEach((link, i) => {
      link.classList.toggle('active', i === currentSlideIndex);
    });

      // Update Side Nav Doodle Encircle
    if (typeof updateSideNavActiveFromSlide === 'function') {
      updateSideNavActiveFromSlide(currentSlideIndex);
    }

    playTacticalBlip(980, 0.05, 'triangle');
  }
}

function nextSlide() {
  const next = (currentSlideIndex + 1) % totalSlides;
  goToSlide(next);
}

function prevSlide() {
  const prev = (currentSlideIndex - 1 + totalSlides) % totalSlides;
  goToSlide(prev);
}

  // Mode Switching(Slide Deck < -> Continuous Scroll)
function toggleViewMode() {
  isScrollMode = !isScrollMode;
  document.body.classList.toggle('mode-scroll', isScrollMode);
  document.body.classList.toggle('mode-deck', !isScrollMode);

  const modeBtn = document.getElementById('view-mode-toggle');
  const modeLabel = document.getElementById('mode-label');

  if (isScrollMode) {
    modeBtn.classList.add('active');
    modeLabel.textContent = 'VIEW: SCROLL WEBSITE';
      // Jump to current slide section in scroll view
    const scrollMap = {
      0: 'scroll-sec-0',
      1: 'scroll-sec-why',
      2: 'scroll-sec-future',
      3: 'scroll-sec-4'
    };
    const target = document.getElementById(scrollMap[currentSlideIndex] || `scroll-sec-${currentSlideIndex}`);
    if (target) {
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  } else {
    modeBtn.classList.remove('active');
    modeLabel.textContent = 'VIEW: SLIDE DECK';
    goToSlide(currentSlideIndex);
  }

  playTacticalBlip(1200, 0.08, 'sine');
}

  // Sound Toggle
function toggleAudio() {
  initAudio();
  audioEnabled = !audioEnabled;
  const audioBtn = document.getElementById('audio-toggle');
  const audioIcon = document.getElementById('audio-icon');

  if (audioEnabled) {
    audioBtn.classList.add('active');
    audioIcon.textContent = '⚡ AUDIO: ON';
    playTacticalBlip(880, 0.08, 'sine');
  } else {
    audioBtn.classList.remove('active');
    audioIcon.textContent = '⚡ AUDIO: OFF';
  }
}

// ============================================================================
  // BREACHMATRIX CONNECT CHATBOT & NETLIFY FORM SUBMISSION
  // ============================================================================
const BREACHMATRIX_WA_PHONE = '919444852803';
const BREACHMATRIX_FORM_NAME = 'breachmatrix-enquiry';

let aiChatState = {
  // step: 'greeting', 'org', 'contact', 'solution', 'notes', 'complete'
  org: '',
  contact: '',
  contactName: '',
  contactMobile: '',
  contactEmail: '',
  solution: '',
  notes: '',
  initialized: false,
  isTyping: false,
  isSubmitting: false,
  submitted: false
};

function escapeAIChatHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setupChatScrollSupport() {
  const modal = document.getElementById('secure-modal');
  const drawer = document.querySelector('.ai-drawer-window');
  const chatView = document.getElementById('ai-chat-view');
  const container = document.getElementById('ai-messages-container');

  [modal, drawer, chatView, container].forEach(el => {
    if (el) {
      el.setAttribute('data-lenis-prevent', 'true');
      el.setAttribute('data-lenis-prevent-wheel', 'true');
      el.setAttribute('data-lenis-prevent-touch', 'true');
    }
  });

  if (container && !container._wheelAttached) {
    container._wheelAttached = true;
    container.addEventListener('wheel', function (e) {
      e.stopPropagation();
      const prev = container.scrollTop;
      container.scrollTop += e.deltaY;
      if (container.scrollTop !== prev) {
        e.preventDefault();
      }
    }, { passive: false });
  }
}

function openSecureDispatchModal(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const modal = document.getElementById('secure-modal');
  if (modal) {
    document.body.classList.add('chat-drawer-open');
    modal.classList.add('open');
    playTacticalBlip(1040, 0.07, 'square');
    setupChatScrollSupport();
    if (!aiChatState.initialized) {
      initAIChat();
    }
  }
}

function closeSecureDispatchModal() {
  const modal = document.getElementById('secure-modal');
  if (modal) {
    document.body.classList.remove('chat-drawer-open');
    modal.classList.remove('open');
    playTacticalBlip(520, 0.05, 'sine');
  }
}

function switchDrawerTab(tab) {
  const chatView = document.getElementById('ai-chat-view');
  const formView = document.getElementById('ai-form-view');
  const tabBtnChat = document.getElementById('tab-btn-chat');
  const tabBtnForm = document.getElementById('tab-btn-form');

  if (tab === 'chat') {
    if (chatView) chatView.style.display = 'flex';
    if (formView) formView.style.display = 'none';
    tabBtnChat?.classList.add('active');
    tabBtnForm?.classList.remove('active');
  } else {
    if (chatView) chatView.style.display = 'none';
    if (formView) formView.style.display = 'flex';
    tabBtnChat?.classList.remove('active');
    tabBtnForm?.classList.add('active');

      // Sync collected values into form
    if (aiChatState.org && document.getElementById('org-input')) {
      document.getElementById('org-input').value = aiChatState.org;
    }
    if (aiChatState.contact && document.getElementById('email-input')) {
      document.getElementById('email-input').value = aiChatState.contact;
    }
    if (aiChatState.notes && document.getElementById('notes-input')) {
      document.getElementById('notes-input').value = aiChatState.notes;
    }
  }
  playTacticalBlip(800, 0.04, 'sine');
}

function getChatTimestamp() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function initAIChat() {
  aiChatState = {
    step: 'initial',
    org: '',
    contact: '',
    contactName: '',
    contactMobile: '',
    contactEmail: '',
    solution: '',
    notes: '',
    initialized: true,
    isTyping: false,
    isSubmitting: false,
    submitted: false
  };

  const container = document.getElementById('ai-messages-container');
  if (container) container.innerHTML = '';

  showTyping(true);
  setTimeout(() => {
    showTyping(false);
    renderBotMessage(
      `Welcome to **BreachMatrix Connect**.\n\nWe deliver bespoke **Website Development, Graphic Design & Digital Products** tailored to your needs.\n\nSelect an area of interest below or type your inquiry directly:`,
      [
        'Website Development Services',
        'Graphic Design & Digital Products',
        'Start a Project Brief'
      ]
    );
    const input = document.getElementById('ai-user-input');
    if (input) input.focus();
  }, 350);
}

function resetAIChat() {
  playTacticalBlip(640, 0.06, 'sawtooth');
  initAIChat();
}

function showTyping(show) {
  aiChatState.isTyping = show;
  const indicator = document.getElementById('ai-typing-indicator');
  if (indicator) {
    indicator.style.display = show ? 'flex' : 'none';
    scrollAIChatToBottom();
  }
}

function scrollAIChatToBottom() {
  const container = document.getElementById('ai-messages-container');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

function renderBotMessage(markdownText, chips = [], withBrief = false) {
  const container = document.getElementById('ai-messages-container');
  if (!container) return;

  const timeStr = getChatTimestamp();
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg bot';

  let formatted = escapeAIChatHtml(markdownText)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');

  let briefHtml = '';
  if (withBrief) {
    briefHtml = `
      <div class="ai-brief-card">
        <div class="brief-header">
          <span class="brief-title">SOLUTION BRIEF ASSEMBLED</span>
          <span class="brief-tag">READY FOR DISPATCH</span>
        </div>
        <div class="brief-row"><strong>Org:</strong> ${escapeAIChatHtml(aiChatState.org || 'Not Specified')}</div>
        <div class="brief-row"><strong>Contact:</strong> ${escapeAIChatHtml(aiChatState.contact || 'Not Specified')}</div>
        <div class="brief-row"><strong>Solution Track:</strong> ${escapeAIChatHtml(aiChatState.solution || 'Custom Software Development')}</div>
        <div class="brief-row"><strong>Friction & Goals:</strong> ${escapeAIChatHtml(aiChatState.notes || 'Full Lifecycle Solutions')}</div>
        <div class="brief-actions">
          <button type="button" class="btn-wa-dispatch" id="btn-submit-enquiry" onclick="submitProjectEnquiry()">
            SUBMIT PROJECT ENQUIRY ➔
          </button>
          <button type="button" class="btn-copy-brief" onclick="copyBriefText()">
            Copy Brief Text to Clipboard
          </button>
        </div>
      </div>
    `;
  }

  msgDiv.innerHTML = `
    <div class="msg-bubble-wrap">
      <div class="msg-bubble">${formatted}${briefHtml}</div>
      <span class="msg-timestamp">${timeStr}</span>
    </div>
  `;

  container.appendChild(msgDiv);
  playTacticalBlip(1280, 0.05, 'sine');
  renderChipsInFlow(chips);
  scrollAIChatToBottom();
}

function renderChipsInFlow(chips) {
  const container = document.getElementById('ai-messages-container');
  if (!container) return;

  const existingPending = container.querySelectorAll('.chat-msg-options-pending');
  existingPending.forEach(el => el.remove());

  if (!chips || chips.length === 0) return;

  const timeStr = getChatTimestamp();
  const optionsDiv = document.createElement('div');
  optionsDiv.className = 'chat-msg bot chat-msg-options-pending';
  optionsDiv.innerHTML = `
    <div class="msg-bubble-wrap">
      <div class="ai-pills-card">
        ${chips.map(c => `
          <button type="button" class="ai-pill-btn" onclick="handleChipClick('${escapeAIChatHtml(c)}')">
            <span>${escapeAIChatHtml(c)}</span>
          </button>
        `).join('')}
      </div>
      <span class="msg-timestamp">${timeStr}</span>
    </div>
  `;
  container.appendChild(optionsDiv);
}

function renderContactDetailsForm() {
  const container = document.getElementById('ai-messages-container');
  if (!container) return;

  const existingForm = container.querySelector('.contact-details-form');
  if (existingForm) existingForm.remove();

  const form = document.createElement('form');
  form.className = 'contact-details-form';
  form.setAttribute('aria-label', 'Primary contact details');
  form.innerHTML = `
    <label>
      <span>CONTACT NAME</span>
      <input type="text" name="contact-name" autocomplete="name" required>
    </label>
    <label>
      <span>MOBILE NUMBER</span>
      <input type="tel" name="contact-mobile" autocomplete="tel" required>
    </label>
    <label>
      <span>EMAIL ADDRESS</span>
      <input type="email" name="contact-email" autocomplete="email" required>
    </label>
    <button type="submit" class="contact-details-submit">CONTINUE ➔</button>
  `;

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get('contact-name') || '').trim();
    const mobile = String(formData.get('contact-mobile') || '').trim();
    const email = String(formData.get('contact-email') || '').trim();
    if (!name || !mobile || !email) return;

    aiChatState.contactName = name;
    aiChatState.contactMobile = mobile;
    aiChatState.contactEmail = email;
    aiChatState.contact = `${name} | Mobile: ${mobile} | Email: ${email}`;
    form.remove();
    renderUserMessage(`Name: ${name}\nMobile: ${mobile}\nEmail: ${email}`);
    showTyping(true);
    setTimeout(() => {
      showTyping(false);
      aiChatState.step = 'solution';
      renderBotMessage(
        `Contact details stored for **${aiChatState.contactName}**.\n\nWhich **BreachMatrix track** best fits your project?`,
        [
          'Custom Website Development',
          'Graphic Design & Branding',
          'All Digital Products & Toolkits',
          'Full-Lifecycle Engineering'
        ]
      );
    }, 350);
  });

  container.appendChild(form);
  form.querySelector('input').focus();
  scrollAIChatToBottom();
}

function renderUserMessage(text) {
  const container = document.getElementById('ai-messages-container');
  if (!container) return;

  const existingPending = container.querySelectorAll('.chat-msg-options-pending');
  existingPending.forEach(el => el.remove());

  const timeStr = getChatTimestamp();
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg user';
  msgDiv.innerHTML = `
    <div class="msg-bubble-wrap">
      <div class="msg-bubble">${escapeAIChatHtml(text)}</div>
      <span class="msg-timestamp">${timeStr}</span>
    </div>
  `;

  container.appendChild(msgDiv);
  scrollAIChatToBottom();
}

function handleChipClick(chipText) {
  playTacticalBlip(980, 0.04, 'triangle');
  processUserMessage(chipText);
}

function handleAIChatSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('ai-user-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  processUserMessage(text);
}

function processUserMessage(rawText) {
  if (aiChatState.isTyping) return;
  renderUserMessage(rawText);
  showTyping(true);

  const text = rawText.trim();
  const lower = text.toLowerCase();

  setTimeout(() => {
    showTyping(false);

      // Global reset check
    if (lower === 'reset' || lower === 'restart' || lower === 'start over' || lower === 'menu') {
      initAIChat();
      return;
    }

    // Step - by - step Brief Wizard
    if (aiChatState.step === 'org') {
      aiChatState.org = text;
      aiChatState.step = 'contact';
      renderBotMessage(
        `Organization registered: **${aiChatState.org}**.\n\nPlease enter the primary contact details below:`
      );
      renderContactDetailsForm();
      return;
    } else if (aiChatState.step === 'contact') {
      return;
    } else if (aiChatState.step === 'solution') {
      aiChatState.solution = text;
      aiChatState.step = 'notes';
      renderBotMessage(
        `Requirement categorized under **${aiChatState.solution}**.\n\nWhat **specific operational friction, problem, or design goals** should we solve?`,
        [
          'Automate daily manual bottlenecks',
          'Build high-performance business website',
          'Brand identity & graphic design assets',
          'Digital product / web application',
          'Founder / personal portfolio website'
        ]
      );
      return;
    } else if (aiChatState.step === 'notes') {
      aiChatState.notes = text;
      aiChatState.step = 'complete';
      renderBotMessage(
        `All details captured. Here is your **BreachMatrix Project Brief**. Submit it here and our team will receive your enquiry directly:`,
        ['Submit Project Enquiry', 'Modify Details'],
        true
      );
      return;
    }

      // Branching for Initial and Contextual Inquiries
    if (lower.includes('friction') || lower.includes('workflow') || lower.includes('surprise')) {
      renderBotMessage(
        `We can help turn your requirements into a practical digital solution. Choose a service below or start a project brief to tell us more.`,
        ['Website Development Services', 'Graphic Design & Digital Products', 'Start a Project Brief']
      );
    } else if (lower.includes('website') || lower.includes('web development') || lower.includes('web dev') || lower.includes('portfolio') || lower.includes('custom site') || lower.includes('seo')) {
      renderBotMessage(
        `**Custom Website Development Services**\n\nWe provide bespoke website engineering for businesses, startups, and individual clients. Separate from our in-house products, our client services division builds fast, responsive, and visually stunning web platforms.\n\n• **Aesthetics**: Cyberpunk, editorial, or minimalist dark modes with GSAP & Lenis smooth scroll\n• **Performance**: Lighthouse 95+ scores with semantic SEO architecture\n• **Mobile-First**: Flawless responsive scaling across every device\n• **Delivery**: Collaborative, iterative delivery with direct technical partnership`,
        [
          'Start a Project Brief',
          'Graphic Design & Digital Products',
          'Speak to WhatsApp Desk'
        ]
      );
    } else if (lower.includes('graphic') || lower.includes('design') || lower.includes('branding') || lower.includes('logo') || lower.includes('digital product') || lower.includes('product')) {
      renderBotMessage(
        `**Graphic Design & All Digital Products**\n\nWe craft high-impact visual identities, graphic design assets, and full-spectrum digital products for modern brands and visionary founders.\n\n• **Graphic Design**: Complete brand identities, logomarks, typography scales, editorial graphics, vector illustrations, and marketing collateral\n• **All Digital Products**: Interactive UI/UX systems, web applications, SaaS dashboards, mobile interfaces, and digital toolkits\n• **Design Standards**: Cohesive aesthetic language, typographic excellence, and print-to-digital consistency`,
        [
          'Start a Project Brief',
          'Website Development Services',
          'Speak to WhatsApp Desk'
        ]
      );
    } else if (aiChatState.step !== 'complete' && (lower.includes('project') || lower.includes('brief') || lower.includes('start a project') || lower.includes('inquiry') || lower.includes('assemble'))) {
      aiChatState.step = 'org';
      renderBotMessage(
        `Let's assemble your **BreachMatrix Project Brief**.\n\nWhat is your **company or organization name**?`
      );
    } else if (lower.includes('price') || lower.includes('pricing') || lower.includes('cost') || lower.includes('rate') || lower.includes('quote')) {
      renderBotMessage(
        `**Transparent Scoping & Pricing**\n\n• **Website Development**: Fixed-milestone pricing based on design complexity, animations, and custom functionality.\n• **Graphic Design & Digital Products**: Scope and pricing depend on the deliverables and project requirements.\n\nWe provide itemized scopes and transparent estimates within 4 business hours.`,
        [
          'Start a Project Brief',
          'Speak to WhatsApp Desk'
        ]
      );
    } else if (lower.includes('team') || lower.includes('architect') || lower.includes('who are you') || lower.includes('founder') || lower.includes('ethan')) {
      renderBotMessage(
        `**The BreachMatrix Team**\n\nOur team is united by a single purpose: solving your everyday worries through human-centric software. Combining engineering excellence with proactive client partnership, our multidisciplinary team pairs disciplined product craft with dedicated client services.`,
        [
          'Website Development Services',
          'Start a Project Brief'
        ]
      );
    } else if (lower.includes('tech') || lower.includes('stack') || lower.includes('technology') || lower.includes('gsap') || lower.includes('framework')) {
      renderBotMessage(
        `**BreachMatrix Tech Stack**\n\n• **Frontend Motion**: GSAP 3.15, ScrollTrigger, Lenis Inertia Scroll, Three.js / WebGL\n• **Architecture**: Vanilla CSS tokens, semantic HTML5, zero-bloat standalone bundles\n• **Backend & Cloud**: Cloud-native serverless, edge computing, resilient microservices\n• **Security**: Defensive architectures and verified data encryption`,
        [
          'Website Development Services',
        ]
      );
    } else if (lower.includes('whatsapp') || lower.includes('desk') || lower.includes('phone') || lower.includes('call') || lower.includes('live') || lower.includes('speak')) {
      renderBotMessage(
        `Connecting directly to our WhatsApp desk.\n\nClick below to open chat:`,
        ['Open WhatsApp Now']
      );
      triggerDirectWhatsApp();
    } else if (lower.includes('modify') || lower.includes('edit')) {
      aiChatState.step = 'org';
      renderBotMessage(
        `Let's refine your brief. What is your **Organization Name**?`
      );
    } else if (aiChatState.step === 'complete') {
      if (lower.includes('modify') || lower.includes('edit')) {
        aiChatState.step = 'org';
        renderBotMessage(
          `Let's refine your brief. What is your **Organization Name**?`
        );
      } else if (lower.includes('submit') || lower.includes('send')) {
        submitProjectEnquiry();
      } else {
        renderBotMessage(
          `Your project brief for **${aiChatState.org || 'your team'}** is ready. Submit it securely here when you're ready.`,
          ['Submit Project Enquiry', 'Modify Details'],
          true
        );
      }
    } else {
        // General free - form input
      renderBotMessage(
        `Thank you for your message regarding: "*${escapeAIChatHtml(text)}*".\n\nHow would you like to proceed?`,
        [
          'Assemble Project Brief with this',
          'Website Development Services',
          'Speak to WhatsApp Desk'
        ]
      );
    }
  }, 450);
}

function generateWhatsAppMessage() {
  const org = aiChatState.org || 'Confidential Client';
  const contact = aiChatState.contact || 'Direct Inquirer';
  const solution = aiChatState.solution || 'Custom Software / Website Project';
  const notes = aiChatState.notes || 'Inquiry regarding software products and custom website development services.';

  return `BREACHMATRIX PROJECT ENQUIRY
━━━━━━━━━━━━━━━━━━━━━
🏢 *Organization:* ${org}
👤 *Contact:* ${contact}
⚡ *Target Track:* ${solution}
🎯 *Friction & Goals:* ${notes}
━━━━━━━━━━━━━━━━━━━━━
Submitted via BreachMatrix Connect (breachmatrix.in)`;
}

async function submitProjectEnquiry() {
  if (aiChatState.isSubmitting || aiChatState.submitted) return;

  const required = [
    ['Organization name', aiChatState.org],
    ['Contact details', aiChatState.contact],
    ['Service or project category', aiChatState.solution],
    ['Project requirements', aiChatState.notes]
  ];
  const missing = required.find(([, value]) => !String(value || '').trim());
  if (missing) {
    renderBotMessage(`Before submitting, please provide your **${missing[0]}**. Your existing answers have been kept.`);
    return;
  }

  aiChatState.isSubmitting = true;
  const button = document.getElementById('btn-submit-enquiry');
  if (button) {
    button.disabled = true;
    button.textContent = 'SUBMITTING ENQUIRY...';
  }

  const payload = new URLSearchParams({
    'form-name': BREACHMATRIX_FORM_NAME,
    'bot-field': '',
    organization: aiChatState.org,
    contact: aiChatState.contact,
    'contact-name': aiChatState.contactName,
    'contact-mobile': aiChatState.contactMobile,
    'contact-email': aiChatState.contactEmail,
    service: aiChatState.solution,
    requirements: aiChatState.notes
  });

  try {
    const response = await fetch(window.location.pathname || '/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: payload.toString()
    });
    if (!response.ok) throw new Error(`Netlify Forms returned HTTP ${response.status}`);

    aiChatState.submitted = true;
    renderBotMessage(`Thank you! We've successfully received all your project details. Our team will review your enquiry and get in touch with you soon.`);
    playTacticalBlip(1280, 0.12, 'sine');
    if (button) {
      button.textContent = 'ENQUIRY SUBMITTED ✓';
      button.disabled = true;
    }
  } catch (error) {
    console.error('BreachMatrix enquiry submission failed:', error);
    renderBotMessage(`We couldn't submit your enquiry just now. Your answers are still saved in this chat—please try submitting again in a moment.`);
    if (button) {
      button.disabled = false;
      button.textContent = 'RETRY PROJECT ENQUIRY ➔';
    }
  } finally {
    aiChatState.isSubmitting = false;
  }
}

const directWhatsAppContact = triggerDirectWhatsApp;

function dispatchBriefToWhatsApp() {
  const msg = generateWhatsAppMessage();
  const url = `https: api.whatsapp.com/send?phone=${BREACHMATRIX_WA_PHONE}&text=${encodeURIComponent(msg)}`;
  playTacticalBlip(1760, 0.2, 'sine');
  window.open(url, '_blank');
}

function shareBriefViaWhatsApp() {
  const msg = generateWhatsAppMessage();
  const url = `https: api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  playTacticalBlip(1400, 0.15, 'triangle');
  window.open(url, '_blank');
}

function copyBriefText() {
  const msg = generateWhatsAppMessage();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(msg).then(() => {
      alert('✔ Project brief copied to clipboard.');
      playTacticalBlip(1040, 0.1, 'sine');
    }).catch(() => {
      prompt('Copy your project brief:', msg);
    });
  } else {
    prompt('Copy your project brief:', msg);
  }
}

function triggerDirectWhatsApp(e) {
  if (e) e.stopPropagation();
  const msg = aiChatState.org
    ? generateWhatsAppMessage()
    : `*BREACHMATRIX INQUIRY*\nHello! I would like to connect with your solution architects regarding custom software products and services.`;
  const url = `https: api.whatsapp.com/send?phone=${BREACHMATRIX_WA_PHONE}&text=${encodeURIComponent(msg)}`;
  playTacticalBlip(1760, 0.15, 'sine');
  window.open(url, '_blank');
}

  // Legacy quick-form entry point: submit the same collected fields through Netlify.
function handleDispatchSubmit(e) {
  e.preventDefault();
  const org = document.getElementById('org-input')?.value || '';
  const email = document.getElementById('email-input')?.value || '';
  const scope = document.getElementById('scope-input')?.value || '';
  const notes = document.getElementById('notes-input')?.value || '';

  aiChatState.org = org;
  aiChatState.contact = email;
  aiChatState.solution = scope;
  aiChatState.notes = notes;

  const btn = document.getElementById('btn-submit-dispatch');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'SUBMITTING ENQUIRY...';
  }
  submitProjectEnquiry().finally(() => {
    if (btn && !aiChatState.submitted) {
      btn.disabled = false;
      btn.textContent = 'SUBMIT PROJECT ENQUIRY ➔';
    }
  });
}

// Keyboard Navigation & Lockdown
window.addEventListener('keydown', (e) => {
  // If connect drawer is open, block all keys from moving the main website
  if (document.body.classList.contains('chat-drawer-open')) {
    if (e.key === 'Escape') {
      closeSecureDispatchModal();
    }
    return;
  }

  // Ignore if user is typing in form inputs
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    return;
  }

  if (!isScrollMode) {
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      nextSlide();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'Home') {
      e.preventDefault();
      goToSlide(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      goToSlide(totalSlides - 1);
    }
  }

  if (e.key === 'Escape') {
    closeSecureDispatchModal();
  }
});

  // Touch Swipe Detection for Slide Deck
let touchStartX = 0;
let touchEndX = 0;

window.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

window.addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
}, { passive: true });

function handleSwipe() {
  if (isScrollMode || document.body.classList.contains('chat-drawer-open')) return;
  const threshold = 50;
  if (touchEndX < touchStartX - threshold) {
    nextSlide();
  } else if (touchEndX > touchStartX + threshold) {
    prevSlide();
  }
}

  // ============================================================================
  // SIDE NAV DOODLE ENCIRCLE ACTIVE INDICATOR
  // ============================================================================
const slideToSectionMap = {
  0: 'cover',
  1: 'about',
  2: 'service',
  3: 'contact'
};

function updateSideNavActive(sectionKey) {
  const panel = document.getElementById('staggered-menu-panel');
  if (!panel) return;
  const items = panel.querySelectorAll('.sm-panel-item');
  items.forEach(item => {
    const isCurrent = item.getAttribute('data-section') === sectionKey;
    if (isCurrent) {
      if (!item.classList.contains('active')) {
        item.classList.add('active');
        const path = item.querySelector('.sm-doodle-oval path');
        if (path) {
          path.style.strokeDashoffset = '1100';
          void path.getBoundingClientRect();
          path.style.strokeDashoffset = '0';
        }
      }
    } else {
      item.classList.remove('active');
      const path = item.querySelector('.sm-doodle-oval path');
      if (path) {
        path.style.strokeDashoffset = '1100';
      }
    }
  });
}

function updateSideNavActiveFromSlide(slideIdx) {
  const sectionKey = slideToSectionMap[slideIdx] || 'cover';
  updateSideNavActive(sectionKey);
}

function initPageActiveItem() {
  const currentPath = window.location.pathname.split('/').pop().toLowerCase() || 'index.html';
  if (currentPath.includes('about')) {
    updateSideNavActive('about');
  } else if (currentPath.includes('products')) {
    updateSideNavActive('products');
  } else if (currentPath.includes('works')) {
    updateSideNavActive('works');
  } else if (currentPath.includes('service')) {
    updateSideNavActive('service');
  } else {
    updateSideNavActiveFromSlide(currentSlideIndex);
  }
}

  // Scroll Progress Spy for Scroll Mode
function updateScrollSpy() {
    if (!isScrollMode) return;

    // Active Nav Link Spy
    const sections = document.querySelectorAll('.scroll-section');
    if (!sections.length) return;

    sections.forEach((sec, idx) => {
      const rect = sec.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.45 && rect.bottom >= window.innerHeight * 0.15) {
        currentSlideIndex = idx;
        const navLinks = document.querySelectorAll('.top-nav .nav-link');
        navLinks.forEach((link, i) => {
          link.classList.toggle('active', i === idx);
        });

        // Update Side Nav Active Doodle
        updateSideNavActiveFromSlide(idx);
      }
    });
  }

window.addEventListener('scroll', updateScrollSpy);

  // UI Event Listeners Initialization
document.addEventListener('DOMContentLoaded', () => {
  const modeBtn = document.getElementById('view-mode-toggle');
  if (modeBtn) modeBtn.addEventListener('click', toggleViewMode);

  const audioBtn = document.getElementById('audio-toggle');
  if (audioBtn) audioBtn.addEventListener('click', toggleAudio);

    // Close modal when clicking on backdrop
  const modal = document.getElementById('secure-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeSecureDispatchModal();
    });
  }

    // Click on re - expand indicator badge to close chat and re - expand website
  const reexpandIndicator = document.getElementById('site-reexpand-indicator');
  if (reexpandIndicator) {
    reexpandIndicator.addEventListener('click', (e) => {
      e.stopPropagation();
      closeSecureDispatchModal();
    });
  }

    // Interactive UI buttons sound effect on hover
  document.querySelectorAll('button, .index-item-card, .nav-link, .hero-scroll-trigger, .hero-breadcrumb-home').forEach(el => {
    el.addEventListener('mouseenter', () => playTacticalBlip(540, 0.03, 'sine'));
  });

    // Initialize scroll spy and page active item on load
  updateScrollSpy();
  if (typeof initPageActiveItem === 'function') {
    initPageActiveItem();
  }

    // Initialize Chat Drawer Scroll & Lenis isolation
  setupChatScrollSupport();

    // Initialize GSAP Staggered Side Nav Bar
  initStaggeredMenu({
    position: 'right',
    colors: ['#181820', '#d4ff00'],
    accentColor: '#d4ff00',
    menuButtonColor: '#ffffff',
    openMenuButtonColor: '#d4ff00',
    changeMenuColorOnOpen: true,
    closeOnClickAway: true
  });

    // Initialize 3D Orb Travel Toggle (ON: Travels across sections / OFF: Fixed in Hero)
  initOrbTravelToggle();
});

// ============================================================================
// 3D ORB TRAVEL TOGGLE CONTROLLER (TRAVEL ACROSS SECTIONS vs FIXED IN HERO)
// ============================================================================
function initOrbTravelToggle() {
  const toggleBtn = document.getElementById('orb-travel-btn') || document.getElementById('orb-toggle-btn');
  if (!toggleBtn) return;

  const savedState = localStorage.getItem('bm_orb_travel');
  // Default to 'off' (Fixed in Hero Section, so it won't block) or saved preference
  const isOff = savedState === 'off' || savedState === null;

  function applyTravelState(off, save) {
    if (off) {
      document.body.classList.add('orb-travel-off');
      document.documentElement.classList.add('orb-travel-off');
      toggleBtn.classList.remove('is-active');
      toggleBtn.setAttribute('aria-pressed', 'false');
      window.__orbTravelEnabled = false;
      if (save) localStorage.setItem('bm_orb_travel', 'off');
    } else {
      document.body.classList.remove('orb-travel-off');
      document.documentElement.classList.remove('orb-travel-off');
      toggleBtn.classList.add('is-active');
      toggleBtn.setAttribute('aria-pressed', 'true');
      window.__orbTravelEnabled = true;
      if (save) localStorage.setItem('bm_orb_travel', 'on');
    }
  }

  // Apply initial state
  applyTravelState(isOff, false);

  let lastToggleTime = 0;
  window.toggleOrbTravel = function (e) {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    const now = Date.now();
    if (now - lastToggleTime < 250) return;
    lastToggleTime = now;

    const isCurrentlyOff = document.body.classList.contains('orb-travel-off') || document.documentElement.classList.contains('orb-travel-off');
    applyTravelState(!isCurrentlyOff, true);
    if (typeof playTacticalBlip === 'function') {
      playTacticalBlip(!isCurrentlyOff ? 360 : 720, 0.04, 'sine');
    }
  };

  window.toggleOrbDisplay = window.toggleOrbTravel;
  toggleBtn.removeEventListener('click', window.toggleOrbTravel);
  toggleBtn.addEventListener('click', window.toggleOrbTravel);
}

  // ============================================================================
  // STAGGERED SIDE NAV BAR(GSAP ANIMATION CONTROLLER)
  // ============================================================================
function initStaggeredMenu({
  position = 'right',
  colors = ['#181820', '#d4ff00'],
  menuButtonColor = '#ffffff',
  openMenuButtonColor = '#d4ff00',
  accentColor = '#d4ff00',
  changeMenuColorOnOpen = true,
  closeOnClickAway = true
} = {}) {
  const wrapper = document.getElementById('staggered-menu-wrapper');
  if (!wrapper || typeof gsap === 'undefined') return;

  const panel = document.getElementById('staggered-menu-panel');
  const preContainer = document.getElementById('sm-prelayers');
  const toggleBtn = document.getElementById('sm-toggle-btn');
  const textInner = document.getElementById('sm-toggle-textInner');
  const icon = document.getElementById('sm-icon');
  const plusH = document.getElementById('sm-icon-plus-h');
  const plusV = document.getElementById('sm-icon-plus-v');

  if (!panel || !toggleBtn || !icon || !textInner) return;

  let isOpen = false;
  let isBusy = false;
  let openTimeline = null;
  let closeTween = null;
  let spinTween = null;
  let colorTween = null;
  let textCycleAnim = null;
  let itemEntranceTween = null;

  const backdrop = document.getElementById('sm-backdrop');
  const preLayers = preContainer ? Array.from(preContainer.querySelectorAll('.sm-prelayer')) : [];
  const offscreen = position === 'left' ? -100 : 100;

    // Initial GSAP Setup
  gsap.set([panel, ...preLayers], { xPercent: offscreen, opacity: 1 });
  if (backdrop) {
    gsap.set(backdrop, { opacity: 0 });
  }
  if (preContainer) {
    gsap.set(preContainer, { xPercent: 0, opacity: 1 });
  }
  if (plusH) gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0 });
  if (plusV) gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
  gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
  gsap.set(textInner, { yPercent: 0 });
  gsap.set(toggleBtn, { color: menuButtonColor });

  function buildOpenTimeline() {
    openTimeline?.kill();
    closeTween?.kill();
    itemEntranceTween?.kill();

    const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
    const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
    const socialTitle = panel.querySelector('.sm-socials-title');
    const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));

    const layerStates = preLayers.map(el => ({ el, start: offscreen }));
    const panelStart = offscreen;

    if (itemEls.length) {
      gsap.set(itemEls, { yPercent: 120, rotate: 6, opacity: 0 });
    }
    if (numberEls.length) {
      gsap.set(numberEls, { '--sm-num-opacity': 0 });
    }
    if (socialTitle) {
      gsap.set(socialTitle, { opacity: 0, y: 12 });
    }
    if (socialLinks.length) {
      gsap.set(socialLinks, { y: 20, opacity: 0 });
    }

    const tl = gsap.timeline({ paused: true });

      // Smooth Backdrop Dimmer
    if (backdrop) {
      tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0);
    }

      // Cascading Layers with fluid power3 easing
    layerStates.forEach((ls, i) => {
      tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: 0.65, ease: 'power3.out' }, i * 0.08);
    });

    const lastTime = layerStates.length ? (layerStates.length - 1) * 0.08 : 0;
    const panelInsertTime = lastTime + (layerStates.length ? 0.09 : 0);
    const panelDuration = 0.7;

    tl.fromTo(
      panel,
      { xPercent: panelStart },
      { xPercent: 0, duration: panelDuration, ease: 'power3.out' },
      panelInsertTime
    );

    if (itemEls.length) {
      const itemsStartRatio = 0.2;
      const itemsStart = panelInsertTime + panelDuration * itemsStartRatio;
      tl.to(
        itemEls,
        {
          yPercent: 0,
          rotate: 0,
          opacity: 1,
          duration: 0.75,
          ease: 'power3.out',
          stagger: { each: 0.06, from: 'start' }
        },
        itemsStart
      );
      if (numberEls.length) {
        tl.to(
          numberEls,
          {
            duration: 0.5,
            ease: 'power2.out',
            '--sm-num-opacity': 1,
            stagger: { each: 0.05, from: 'start' }
          },
          itemsStart + 0.1
        );
      }
    }

    if (socialTitle || socialLinks.length) {
      const socialsStart = panelInsertTime + panelDuration * 0.45;
      if (socialTitle) {
        tl.to(
          socialTitle,
          {
            opacity: 1,
            y: 0,
            duration: 0.45,
            ease: 'power2.out'
          },
          socialsStart
        );
      }
      if (socialLinks.length) {
        tl.to(
          socialLinks,
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            ease: 'power3.out',
            stagger: { each: 0.06, from: 'start' },
            onComplete: () => {
              gsap.set(socialLinks, { clearProps: 'opacity' });
            }
          },
          socialsStart + 0.05
        );
      }
    }

    openTimeline = tl;
    return tl;
  }

  function playOpen() {
    if (isBusy) return;
    isBusy = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => {
        isBusy = false;
      });
      tl.play(0);
    } else {
      isBusy = false;
    }
  }

  function playClose() {
    openTimeline?.kill();
    openTimeline = null;
    itemEntranceTween?.kill();

    const all = [...preLayers, panel];
    closeTween?.kill();

    if (backdrop) {
      gsap.to(backdrop, { opacity: 0, duration: 0.35, ease: 'power2.inOut' });
    }

    closeTween = gsap.to(all, {
      xPercent: offscreen,
      duration: 0.38,
      ease: 'power3.inOut',
      overwrite: 'auto',
      onComplete: () => {
        const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
        if (itemEls.length) {
          gsap.set(itemEls, { yPercent: 120, rotate: 6, opacity: 0 });
        }
        const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
        if (numberEls.length) {
          gsap.set(numberEls, { '--sm-num-opacity': 0 });
        }
        const socialTitle = panel.querySelector('.sm-socials-title');
        const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));
        if (socialTitle) gsap.set(socialTitle, { opacity: 0, y: 12 });
        if (socialLinks.length) gsap.set(socialLinks, { y: 20, opacity: 0 });
        isBusy = false;
      }
    });
  }

  function animateIcon(opening) {
    if (!icon) return;
    spinTween?.kill();
    if (opening) {
      spinTween = gsap.to(icon, { rotate: 225, duration: 0.7, ease: 'power3.out', overwrite: 'auto' });
    } else {
      spinTween = gsap.to(icon, { rotate: 0, duration: 0.35, ease: 'power3.inOut', overwrite: 'auto' });
    }
  }

  function animateColor(opening) {
    if (!toggleBtn) return;
    colorTween?.kill();
    if (changeMenuColorOnOpen) {
      const targetColor = opening ? openMenuButtonColor : menuButtonColor;
      colorTween = gsap.to(toggleBtn, {
        color: targetColor,
        delay: 0.18,
        duration: 0.3,
        ease: 'power2.out'
      });
    } else {
      gsap.set(toggleBtn, { color: menuButtonColor });
    }
  }

  function animateText(opening) {
    if (!textInner) return;
    textCycleAnim?.kill();

    const currentLabel = opening ? 'Menu' : 'Close';
    const targetLabel = opening ? 'Close' : 'Menu';
    const cycles = 3;
    const seq = [currentLabel];
    let last = currentLabel;
    for (let i = 0; i < cycles; i++) {
      last = last === 'Menu' ? 'Close' : 'Menu';
      seq.push(last);
    }
    if (last !== targetLabel) seq.push(targetLabel);
    seq.push(targetLabel);

    textInner.innerHTML = seq.map(line => `<span class="sm-toggle-line">${line}</span>`).join('');

    gsap.set(textInner, { yPercent: 0 });
    const lineCount = seq.length;
    const finalShift = ((lineCount - 1) / lineCount) * 100;
    textCycleAnim = gsap.to(textInner, {
      yPercent: -finalShift,
      duration: 0.5 + lineCount * 0.07,
      ease: 'power4.out'
    });
  }

  function toggleMenu() {
    const target = !isOpen;
    isOpen = target;
    wrapper.setAttribute('data-open', target ? 'true' : '');
    if (!target) wrapper.removeAttribute('data-open');
    panel.setAttribute('aria-hidden', target ? 'false' : 'true');
    toggleBtn.setAttribute('aria-expanded', target ? 'true' : 'false');
    toggleBtn.setAttribute('aria-label', target ? 'Close menu' : 'Open menu');

    if (target) {
      document.documentElement.classList.add('menu-open-scroll-lock');
      document.body.classList.add('menu-open-scroll-lock');
      if (typeof initPageActiveItem === 'function') {
        initPageActiveItem();
      }
      playOpen();
    } else {
      document.documentElement.classList.remove('menu-open-scroll-lock');
      document.body.classList.remove('menu-open-scroll-lock');
      playClose();
    }
    animateIcon(target);
    animateColor(target);
    animateText(target);
  }

  function closeMenu() {
    if (isOpen) {
      isOpen = false;
      document.documentElement.classList.remove('menu-open-scroll-lock');
      document.body.classList.remove('menu-open-scroll-lock');
      wrapper.removeAttribute('data-open');
      panel.setAttribute('aria-hidden', 'true');
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.setAttribute('aria-label', 'Open menu');
      playClose();
      animateIcon(false);
      animateColor(false);
      animateText(false);
    }
  }

  toggleBtn.addEventListener('click', toggleMenu);

  if (closeOnClickAway) {
    document.addEventListener('mousedown', (event) => {
      if (!isOpen) return;
      if (!panel.contains(event.target) && !toggleBtn.contains(event.target)) {
        closeMenu();
      }
    });
  }

    // Handle Menu link clicks with smooth scroll & reliable page redirection
  panel.querySelectorAll('.sm-panel-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const href = item.getAttribute('href');
      const slideIdx = item.getAttribute('data-slide');
      const sectionKey = item.getAttribute('data-section');
      const currentPath = window.location.pathname.split('/').pop().toLowerCase() || 'index.html';

        // Case 0: Clicking CONNECT opens the interactive AI Chat Drawer
      if (sectionKey === 'connect' || item.getAttribute('data-action') === 'chat' || href === '#connect') {
        e.preventDefault();
        closeMenu();
        if (typeof openSecureDispatchModal === 'function') {
          openSecureDispatchModal(e);
        }
        if (typeof switchDrawerTab === 'function') {
          switchDrawerTab('chat');
        }
        return;
      }

      if (sectionKey && typeof updateSideNavActive === 'function') {
        updateSideNavActive(sectionKey);
      }

      if (!href) return;

      const isIndex = currentPath === 'index.html' || currentPath === '' || currentPath.endsWith('/');

        // Case 1: Clicking COVER while on index.html
      if (isIndex && (href === 'index.html#scroll-sec-0' || href === '#scroll-sec-0' || href === 'index.html')) {
        e.preventDefault();
        closeMenu();
        const targetElement = document.getElementById('scroll-sec-0');
        if (targetElement) {
          if (document.body.classList.contains('mode-scroll')) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
          } else {
            if (typeof goToSlide === 'function') {
              goToSlide(0);
            }
          }
        }
        return;
      }

        // Case 2: Target is a separate page(about.html, works.html, service.html)
        // or redirecting back to index.html from another page
      const targetBase = href.split('#')[0];
      if (targetBase && targetBase !== currentPath) {
        e.preventDefault();
        closeMenu();
          // Reliable direct navigation
        window.location.href = href;
        return;
      }

        // Case 3: In - page anchor hash scroll
      if (href.includes('#')) {
        const hash = '#' + href.split('#')[1];
        const targetElement = document.querySelector(hash);
        if (targetElement) {
          e.preventDefault();
          closeMenu();
          targetElement.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }

        // Case 4: Same page link click
      closeMenu();
    });
  });

    // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      closeMenu();
    }
  });
}
