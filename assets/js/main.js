(() => {
  'use strict';

  const cfg = window.GREG_SITE_CONFIG || {};
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

  const ensureToast = () => {
    let toast = $('#site-toast');
    if (toast) return toast;
    toast = document.createElement('div');
    toast.id = 'site-toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = '<strong></strong><span></span>';
    document.body.appendChild(toast);
    return toast;
  };

  const toast = (title, message) => {
    const el = ensureToast();
    $('strong', el).textContent = title;
    $('span', el).textContent = message;
    el.classList.add('show');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => el.classList.remove('show'), 4600);
  };

  $$('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  // Header show/hide: hide while scrolling down, return while scrolling up.
  const header = $('[data-header]') || $('.site-header');
  let lastScrollY = Math.max(window.scrollY, 0);
  let ticking = false;

  const updateHeader = () => {
    if (!header) return;

    const currentY = Math.max(window.scrollY, 0);
    const delta = currentY - lastScrollY;
    header.classList.toggle('scrolled', currentY > 8);

    const menuOpen = document.body.classList.contains('menu-open');
    const modalOpen = document.body.classList.contains('modal-open');

    if (!menuOpen && !modalOpen && currentY > 120 && delta > 10) {
      header.classList.add('header-hidden');
    } else if (delta < -6 || currentY <= 120 || menuOpen || modalOpen) {
      header.classList.remove('header-hidden');
    }

    lastScrollY = currentY;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }, { passive: true });

  // Mobile navigation.
  const menuBtn = $('#menu-toggle');
  const nav = $('#main-nav');

  const closeMenu = () => {
    if (!menuBtn || !nav) return;

    menuBtn.setAttribute('aria-expanded', 'false');
    nav.classList.remove('open');
    document.body.classList.remove('menu-open');
    header?.classList.remove('header-hidden');
    header?.classList.remove('menu-active');
  };

  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const open = menuBtn.getAttribute('aria-expanded') === 'true';

      menuBtn.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('open', !open);
      document.body.classList.toggle('menu-open', !open);
      header?.classList.toggle('menu-active', !open);
      header?.classList.remove('header-hidden');
    });

    nav.addEventListener('click', event => {
      if (event.target.closest('a')) closeMenu();
    });
  }

  const syncMobileNavigation = () => {
    if (window.innerWidth > 900) closeMenu();
  };

  window.addEventListener('resize', syncMobileNavigation, { passive: true });
  window.addEventListener(
    'orientationchange',
    () => window.setTimeout(syncMobileNavigation, 120),
    { passive: true }
  );

  // Mark active internal navigation item.
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';

  $$('.main-nav a[href^="/"]').forEach(link => {
    const href = new URL(link.href, window.location.origin)
      .pathname.replace(/\/+$/, '') || '/';

    if (
      (href === '/' && pathname === '/') ||
      (href !== '/' && pathname.startsWith(href))
    ) {
      link.setAttribute('aria-current', 'page');
    }
  });

  // Mobile loan sidebar.
  const sidebarBtn = $('#sidebar-toggle');
  const sidebar = $('#loan-sidebar');

  if (sidebarBtn && sidebar) {
    sidebarBtn.addEventListener('click', () => {
      const open = sidebarBtn.getAttribute('aria-expanded') === 'true';

      sidebarBtn.setAttribute('aria-expanded', String(!open));
      sidebar.classList.toggle('open', !open);
      document.body.classList.toggle('menu-open', !open);
      header?.classList.toggle('menu-active', !open);
      header?.classList.remove('header-hidden');
    });

    sidebar.addEventListener('click', event => {
      if (event.target.closest('a')) {
        sidebarBtn.setAttribute('aria-expanded', 'false');
        sidebar.classList.remove('open');
        document.body.classList.remove('menu-open');
        header?.classList.remove('menu-active');
      }
    });
  }

  // Compact persistent loan-type navigation for pages without the full sidebar.
  const initialiseGlobalLoanDrawer = () => {
    if (
      document.body.dataset.loanDrawer !== 'enabled' ||
      $('#global-loan-drawer')
    ) {
      return;
    }

    const wrapper = document.createElement('div');

    wrapper.innerHTML = `
      <button class="global-loan-trigger" type="button" aria-controls="global-loan-drawer" aria-expanded="false">Browse Loan Types</button>
      <aside class="global-loan-drawer" id="global-loan-drawer" aria-hidden="true" aria-label="Loan type navigation">
        <button class="global-loan-backdrop" type="button" aria-label="Close loan type navigation"></button>
        <div class="global-loan-panel" role="dialog" aria-modal="true" aria-labelledby="global-loan-title">
          <div class="global-loan-head"><div><h2 id="global-loan-title">Explore Loan Types</h2><p>Research and compare mortgage programmes.</p></div><button class="global-loan-close" type="button" aria-label="Close loan type navigation">×</button></div>
          <nav class="global-loan-nav">
            <a href="/loan-types/conventional/">Conventional Loans</a>
            <a href="/loan-types/fha/">FHA Loans</a>
            <a href="/loan-types/va/">VA Loans</a>
            <a href="/loan-types/jumbo/">Jumbo Loans</a>
            <a href="/loan-types/usda/">USDA Loans</a>
            <a href="/loan-types/refinance/">Refinance</a>
            <a href="/loan-types/first-time-buyer/">First-Time Buyer</a>
            <a href="/loan-types/investment-commercial/">Investment & Commercial</a>
          </nav>
          <div class="global-loan-resource"><strong>Mortgage learning center</strong><p>Continue with educational mortgage guides and borrower resources on this website.</p><a class="text-link" href="/resources/loan-education/">Explore Borrower Resources →</a></div>
        </div>
      </aside>`;

    const trigger = wrapper.firstElementChild;
    const drawer = wrapper.lastElementChild;
    document.body.append(trigger, drawer);

    const panel = $('.global-loan-panel', drawer);
    const closeButtons = $$('.global-loan-close, .global-loan-backdrop', drawer);
    let previousFocus = null;

    const closeDrawer = () => {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('loan-drawer-open');
      previousFocus?.focus?.({ preventScroll: true });
    };

    const openDrawer = () => {
      previousFocus = document.activeElement;
      closeMenu();
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      trigger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('loan-drawer-open');
      header?.classList.remove('header-hidden');
      window.setTimeout(() => $('.global-loan-close', drawer)?.focus(), 30);
    };

    trigger.addEventListener('click', openDrawer);
    closeButtons.forEach(button => button.addEventListener('click', closeDrawer));

    drawer.addEventListener('click', event => {
      if (event.target.closest('a')) closeDrawer();
    });

    document.addEventListener('keydown', event => {
      if (!drawer.classList.contains('open')) return;

      if (event.key === 'Escape') {
        closeDrawer();
        return;
      }

      if (event.key === 'Tab') {
        const focusable = $$(
          'a[href], button:not([disabled])',
          panel
        ).filter(el => el.offsetParent !== null);

        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  };

  initialiseGlobalLoanDrawer();

  // External-link hardening.
  $$('a[target="_blank"]').forEach(link => {
    const rel = new Set(
      (link.getAttribute('rel') || '').split(/\s+/).filter(Boolean)
    );

    rel.add('noopener');
    rel.add('noreferrer');
    link.setAttribute('rel', [...rel].join(' '));
  });

  let lastFocusedElement = null;

  const closeModal = modal => {
    if (!modal) return;

    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');

    if (!$('.modal-backdrop.open')) {
      document.body.classList.remove('modal-open');
    }

    header?.classList.remove('header-hidden');

    if (modal.id === 'video-modal') {
      const body = $('#video-modal-body', modal);
      if (body) body.innerHTML = '';
    }

    if (modal.id === 'form-modal') {
      const frame = $('.form-frame', modal);
      if (frame) frame.src = 'about:blank';
    }

    if (lastFocusedElement && document.contains(lastFocusedElement)) {
      lastFocusedElement.focus({ preventScroll: true });
    }
  };

  const openModal = modal => {
    if (!modal) return;

    lastFocusedElement = document.activeElement;
    closeMenu();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    header?.classList.remove('header-hidden');
    window.setTimeout(() => $('.modal-close', modal)?.focus(), 30);
  };

  const wireModal = modal => {
    if (!modal || modal.dataset.wired === 'true') return;

    modal.dataset.wired = 'true';
    modal.addEventListener('click', event => {
      if (event.target === modal || event.target.closest('[data-close-modal]')) {
        closeModal(modal);
      }
    });
  };

  $$('.modal-backdrop').forEach(wireModal);

  document.addEventListener('keydown', event => {
    const activeModal = $('.modal-backdrop.open');

    if (event.key === 'Escape') {
      $$('.modal-backdrop.open').forEach(closeModal);
      return;
    }

    if (event.key === 'Tab' && activeModal) {
      const focusable = $$(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        activeModal
      ).filter(el => el.offsetParent !== null);

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  // Create a reusable large modal for external secure forms.
  const ensureFormModal = () => {
    let modal = $('#form-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'form-modal';
    modal.className = 'modal-backdrop';
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'form-modal-title');

    modal.innerHTML = `
      <div class="modal form-modal">
        <div class="modal-head">
          <h2 id="form-modal-title">Secure mortgage form</h2>
          <button class="modal-close" type="button" data-close-modal aria-label="Close form">×</button>
        </div>
        <div class="form-modal-body">
          <div class="form-loader"><div><div class="loader-ring"></div><strong>Loading secure form…</strong><p>Please allow a few seconds for the form to appear.</p></div></div>
          <iframe class="form-frame" title="Secure mortgage form" src="about:blank" loading="eager" referrerpolicy="strict-origin-when-cross-origin" allow="clipboard-read; clipboard-write"></iframe>
          <div class="form-fallback"><span>The provider may block embedded forms in some browsers.</span><a class="btn btn-sm" href="#" target="_blank" rel="noopener noreferrer">Open in new tab</a></div>
        </div>
      </div>`;

    document.body.appendChild(modal);
    wireModal(modal);
    return modal;
  };

  const openExternalForm = (url, title = 'Secure mortgage form') => {
    if (!url) return;

    const modal = ensureFormModal();
    const frame = $('.form-frame', modal);
    const loader = $('.form-loader', modal);
    const fallback = $('.form-fallback', modal);
    const openLink = $('.form-fallback a', modal);

    $('#form-modal-title', modal).textContent = title;
    frame.title = title;
    loader.classList.remove('loaded');
    fallback.classList.remove('slow');
    openLink.href = url;
    frame.src = 'about:blank';
    openModal(modal);

    let loaded = false;

    const loadHandler = () => {
      if (frame.src === 'about:blank') return;

      loaded = true;
      loader.classList.add('loaded');
      frame.removeEventListener('load', loadHandler);
    };

    frame.addEventListener('load', loadHandler);
    requestAnimationFrame(() => {
      frame.src = url;
    });

    window.setTimeout(() => {
      if (!loaded && modal.classList.contains('open')) {
        fallback.classList.add('slow');
      }
    }, 6500);
  };

  document.addEventListener('click', event => {
    const link = event.target.closest(
      'a.js-form-modal, a[data-form-modal], a[href*=".secure-clix.com"]'
    );

    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;

    event.preventDefault();

    openExternalForm(
      link.href,
      link.dataset.modalTitle || link.textContent.trim() || 'Secure mortgage form'
    );
  });

  // Internal lead modal.
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-open-lead]');
    if (!button) return;

    event.preventDefault();
    openModal($('#lead-modal'));
  });

  // Consultation scheduling: use a live calendar URL when supplied,
  // otherwise open the on-site preferred-time scheduler.
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-open-schedule]');
    if (!button) return;

    event.preventDefault();

    if (cfg.schedulerUrl) {
      window.open(cfg.schedulerUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    openModal($('#schedule-modal'));
  });

  // All local inquiry and scheduling forms share the server-side Brevo endpoint.
  $$('form[data-lead-form]').forEach(form => {
    if (form.dataset.wired === 'true') return;

    form.dataset.wired = 'true';

    form.addEventListener('submit', async event => {
      event.preventDefault();

      if (form.dataset.sending === 'true') return;

      const hp = form.querySelector('[name="_honey"]');
      if (hp?.value) return;
      if (!form.reportValidity()) return;

      const submit = form.querySelector('[type="submit"]');
      const original = submit?.textContent;

      form.dataset.sending = 'true';

      if (submit) {
        submit.disabled = true;
        submit.textContent = 'Sending…';
      }

      const payload = Object.fromEntries(new FormData(form).entries());

      try {
        const response = await fetch(cfg.formEndpoint || form.action, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            ...payload,
            source_page: window.location.pathname
          })
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        form.reset();
        toast('Request received', 'Thank you. Greg’s team will contact you soon.');
        closeModal(form.closest('.modal-backdrop'));
      } catch (error) {
        console.error(error);
        toast(
          'Request not sent',
          `Please try again or call ${cfg.phoneDisplay || '(949) 864-8178'}.`
        );
      } finally {
        delete form.dataset.sending;

        if (submit) {
          submit.disabled = false;
          submit.textContent = original;
        }
      }
    });
  });

  // Minimum date on scheduler fields.
  const now = new Date();
  const minDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');

  $$('input[type="date"]').forEach(input => {
    input.min = minDate;
  });

  $$('[data-scheduler-link]').forEach(link => {
    if (cfg.schedulerUrl) {
      link.href = cfg.schedulerUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  });

  // Homepage video: muted autoplay with three custom controls.
  const heroVideo = $('[data-hero-video]');

  if (heroVideo && cfg.introVideoEmbedUrl) {
    const playButton = $('[data-video-play]', heroVideo);
    const muteButton = $('[data-video-mute]', heroVideo);
    const fullscreenButton = $('[data-video-fullscreen]', heroVideo);

    const videoUrl = new URL(cfg.introVideoEmbedUrl, window.location.href);

    // Hide YouTube's control bar and remove the forced-captions setting.
    videoUrl.searchParams.set('autoplay', '1');
    videoUrl.searchParams.set('mute', '1');
    videoUrl.searchParams.set('controls', '0');
    videoUrl.searchParams.set('playsinline', '1');
    videoUrl.searchParams.set('enablejsapi', '1');
    videoUrl.searchParams.set('fs', '0');
    videoUrl.searchParams.set('iv_load_policy', '3');
    videoUrl.searchParams.set('origin', window.location.origin);
    videoUrl.searchParams.delete('cc_load_policy');
    videoUrl.searchParams.delete('modestbranding');

    const frame = document.createElement('iframe');
    frame.id = 'greg-hero-video-iframe';
    frame.className = 'hero-video-frame';
    frame.title = 'Greg Deskin introduction video';
    frame.src = videoUrl.toString();
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    heroVideo.appendChild(frame);

    let player;
    let muted = true;
    let playerStarted = false;

    const setPlaying = playing => {
      heroVideo.classList.toggle('is-playing', playing);
      playButton.setAttribute(
        'aria-label',
        playing ? 'Pause video' : 'Play video'
      );
    };

    const startPlayer = () => {
      if (playerStarted) return;
      playerStarted = true;

      player = new YT.Player(frame, {
        events: {
          onReady(event) {
            player = event.target;
            player.mute();

            muted = true;
            heroVideo.classList.add('is-muted');
            muteButton.setAttribute('aria-label', 'Unmute video');
            playButton.disabled = false;
            muteButton.disabled = false;

            player.playVideo();
          },

          onStateChange(event) {
            setPlaying(
              event.data === YT.PlayerState.PLAYING ||
              event.data === YT.PlayerState.BUFFERING
            );
          },

          onAutoplayBlocked() {
            // The visitor can still start playback with the play button.
            setPlaying(false);
          }
        }
      });
    };

    playButton.addEventListener('click', () => {
      if (!player) return;

      if (
        [
          YT.PlayerState.PLAYING,
          YT.PlayerState.BUFFERING
        ].includes(player.getPlayerState())
      ) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    });

    muteButton.addEventListener('click', () => {
      if (!player) return;

      muted = !muted;

      if (muted) {
        player.mute();
      } else {
        player.unMute();
      }

      heroVideo.classList.toggle('is-muted', muted);
      muteButton.setAttribute(
        'aria-label',
        muted ? 'Unmute video' : 'Mute video'
      );
    });

    const updateFullscreenButton = () => {
      const isFullscreen =
        document.fullscreenElement === heroVideo ||
        document.webkitFullscreenElement === heroVideo;

      heroVideo.classList.toggle('is-fullscreen', isFullscreen);
      fullscreenButton.setAttribute(
        'aria-label',
        isFullscreen ? 'Exit full screen' : 'Enter full screen'
      );
    };

    fullscreenButton.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement === heroVideo) {
          await document.exitFullscreen();
        } else if (document.webkitFullscreenElement === heroVideo) {
          document.webkitExitFullscreen();
        } else if (heroVideo.requestFullscreen) {
          await heroVideo.requestFullscreen();
        } else if (heroVideo.webkitRequestFullscreen) {
          heroVideo.webkitRequestFullscreen();
        }
      } catch (error) {
        console.warn('Full screen is unavailable:', error);
      }
    });

    document.addEventListener(
      'fullscreenchange',
      updateFullscreenButton
    );

    document.addEventListener(
      'webkitfullscreenchange',
      updateFullscreenButton
    );

    // Load the YouTube player API for the custom buttons.
    if (window.YT?.Player) {
      startPlayer();
    } else {
      const previousCallback = window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
        if (typeof previousCallback === 'function') {
          previousCallback();
        }

        startPlayer();
      };

      if (
        !document.querySelector(
          'script[src="https://www.youtube.com/iframe_api"]'
        )
      ) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;

        script.addEventListener('error', () => {
          // Show native controls if the control API fails to load.
          videoUrl.searchParams.set('controls', '1');
          frame.src = videoUrl.toString();
          playButton.hidden = true;
          muteButton.hidden = true;
        });

        document.head.appendChild(script);
      }
    }
  }

  // Video modal on any other page using the existing video trigger.
  const videoModal = $('#video-modal');
  const videoBody = $('#video-modal-body');

  const openVideo = () => {
    if (!videoModal || !videoBody) return;

    videoBody.innerHTML = cfg.introVideoEmbedUrl
      ? `<iframe class="video-frame" src="${cfg.introVideoEmbedUrl}" title="Greg Deskin introduction video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`
      : `<div class="video-placeholder"><div><h3>Meet Greg Deskin</h3><p>The approved video URL has not been configured.</p><a class="btn" href="tel:${cfg.phoneE164 || '+19498648178'}">Speak with Greg</a></div></div>`;

    openModal(videoModal);
  };

  $$('[data-open-video]').forEach(button => {
    button.addEventListener('click', openVideo);
  });

  // Review carousel controls.
  const carousel = $('#review-carousel');

  if (carousel) {
    const scrollReviews = direction => {
      const card = $('.review-card', carousel);
      const distance = card
        ? card.getBoundingClientRect().width + 18
        : 350;

      carousel.scrollBy({
        left: direction * distance,
        behavior: 'smooth'
      });
    };

    $('[data-review-prev]')?.addEventListener('click', () => {
      scrollReviews(-1);
    });

    $('[data-review-next]')?.addEventListener('click', () => {
      scrollReviews(1);
    });
  }

  // Cookiebot owns consent storage and the preference dialog.
  $$('[data-cookiebot-renew]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();

      if (window.Cookiebot?.renew) {
        window.Cookiebot.renew();
      }
    });
  });

  // Smooth anchors and accessible focus.
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href^="#"]');

    if (
      !anchor ||
      anchor.matches(
        '[data-cookiebot-renew], [data-open-lead], [data-open-schedule]'
      )
    ) {
      return;
    }

    const id = anchor.getAttribute('href').slice(1);
    const target = id && document.getElementById(id);

    if (!target) return;

    window.setTimeout(() => {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }, 450);
  });

  const footerBottom = document.querySelector('.footer-bottom');

  if (footerBottom && !footerBottom.querySelector('.developer-credit')) {
    footerBottom.insertAdjacentHTML(
      'beforeend',
      '<p class="developer-credit">Developed by <a href="https://nexolioit.com/" target="_blank" rel="noopener noreferrer">NexolioIT</a></p>'
    );
  }
})();