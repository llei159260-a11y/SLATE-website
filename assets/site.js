(() => {
  const body = document.body;
  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('.main-nav');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('[data-current-year]').forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  document.querySelectorAll('article[tabindex="0"]').forEach((node) => {
    node.removeAttribute('tabindex');
  });

  const setNavOpen = (open) => {
    if (!menuButton || !nav) return;
    nav.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
  };

  const syncHeader = () => {
    if (body.classList.contains('page-home') && header) {
      header.classList.toggle('is-scrolled', window.scrollY > 42);
    }
  };
  let syncMobileInquiry = () => {};
  let scrollFrame = null;
  const scheduleScrollSync = () => {
    if (scrollFrame !== null) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = null;
      syncHeader();
      syncMobileInquiry();
    });
  };
  syncHeader();
  window.addEventListener('scroll', scheduleScrollSync, { passive: true });

  if (menuButton && nav) {
    menuButton.addEventListener('click', () => setNavOpen(!nav.classList.contains('is-open')));
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setNavOpen(false)));
  }

  const revealNodes = document.querySelectorAll('[data-reveal]');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealNodes.forEach((node) => node.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    revealNodes.forEach((node) => observer.observe(node));
  }

  const animatedVisuals = document.querySelectorAll('.home-story-art');
  if (animatedVisuals.length) {
    if (reducedMotion || !('IntersectionObserver' in window)) {
      animatedVisuals.forEach((node) => node.classList.add('is-animation-visible'));
    } else {
      const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => entry.target.classList.toggle('is-animation-visible', entry.isIntersecting));
      }, { rootMargin: '120px 0px', threshold: .05 });
      animatedVisuals.forEach((node) => animationObserver.observe(node));
    }
  }

  const hero = document.querySelector('[data-video-hero]');
  const heroVideo = document.querySelector('[data-hero-video]');
  const playButton = document.querySelector('[data-play-toggle]');
  const timeNode = document.querySelector('[data-video-time]');
  const progress = document.querySelector('[data-video-progress]');
  if (hero && heroVideo && playButton && timeNode && progress) {
    let heroVisible = true;
    let heroUserPaused = reducedMotion;
    const mobilePoster = heroVideo.dataset.posterMobile;
    const desktopPoster = heroVideo.getAttribute('poster');
    const syncHeroPoster = () => {
      if (!mobilePoster || !desktopPoster) return;
      heroVideo.poster = window.matchMedia('(max-width: 620px)').matches ? mobilePoster : desktopPoster;
    };
    syncHeroPoster();
    window.addEventListener('resize', syncHeroPoster);
    if (reducedMotion) heroVideo.pause();
    const syncHeroPlayback = () => {
      const shouldPlay = !reducedMotion && heroVisible && !document.hidden && !heroUserPaused;
      if (shouldPlay && heroVideo.paused) heroVideo.play().catch(() => {});
      if (!shouldPlay && !heroVideo.paused) heroVideo.pause();
    };
    const formatTime = (seconds) => `00:${String(Math.floor(seconds || 0)).padStart(2, '0')}`;
    const render = () => {
      const duration = Number.isFinite(heroVideo.duration) ? heroVideo.duration : 18;
      const playing = !heroVideo.paused;
      timeNode.textContent = `${formatTime(heroVideo.currentTime)} / ${formatTime(duration)}`;
      progress.style.width = `${(heroVideo.currentTime / duration) * 100}%`;
      playButton.textContent = playing ? 'Ⅱ' : '▶';
      playButton.setAttribute('aria-label', playing ? '暂停首屏品牌影片' : '播放首屏品牌影片');
      hero.classList.toggle('is-paused', !playing);
    };
    render();
    heroVideo.addEventListener('loadedmetadata', render);
    heroVideo.addEventListener('timeupdate', render);
    heroVideo.addEventListener('play', render);
    heroVideo.addEventListener('pause', render);
    playButton.addEventListener('click', () => {
      if (heroVideo.paused) {
        heroUserPaused = false;
        syncHeroPlayback();
      } else {
        heroUserPaused = true;
        heroVideo.pause();
      }
    });
    if ('IntersectionObserver' in window) {
      const heroObserver = new IntersectionObserver((entries) => {
        const entry = entries[0];
        heroVisible = Boolean(entry?.isIntersecting && entry.intersectionRatio > .12);
        syncHeroPlayback();
      }, { threshold: [0, .12, .5] });
      heroObserver.observe(hero);
    }
    document.addEventListener('visibilitychange', syncHeroPlayback);
  }

  document.querySelectorAll('[data-carousel]').forEach((carousel) => {
    const track = carousel.querySelector('[data-carousel-track]');
    const slides = [...carousel.querySelectorAll('[data-carousel-slide]')];
    const previous = carousel.querySelector('[data-carousel-prev]');
    const next = carousel.querySelector('[data-carousel-next]');
    const dotsRoot = carousel.querySelector('[data-carousel-dots]');
    const status = carousel.querySelector('[data-carousel-status]');
    if (!track || slides.length < 2 || !previous || !next || !dotsRoot) return;

    let index = 0;
    let timer = null;
    let touchStartX = null;
    let carouselVisible = !('IntersectionObserver' in window);
    const dots = slides.map((slide, dotIndex) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `展示第 ${dotIndex + 1} 项`);
      dot.addEventListener('click', () => goTo(dotIndex, true));
      dotsRoot.appendChild(dot);
      return dot;
    });

    const stopAuto = () => {
      window.clearTimeout(timer);
      timer = null;
    };
    const scheduleAuto = () => {
      stopAuto();
      if (reducedMotion || document.hidden || !carouselVisible || carousel.matches(':hover') || carousel.contains(document.activeElement)) return;
      timer = window.setTimeout(() => goTo(index + 1), 5200);
    };
    const renderCarousel = (announce = false) => {
      track.style.transform = `translate3d(${-index * 100}%,0,0)`;
      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
        slide.tabIndex = active ? 0 : -1;
      });
      dots.forEach((dot, dotIndex) => dot.setAttribute('aria-current', String(dotIndex === index)));
      if (status && announce) status.textContent = `当前展示第 ${index + 1} 项，共 ${slides.length} 项`;
    };
    function goTo(nextIndex, announce = false) {
      index = (nextIndex + slides.length) % slides.length;
      renderCarousel(announce);
      scheduleAuto();
    }

    previous.addEventListener('click', () => goTo(index - 1, true));
    next.addEventListener('click', () => goTo(index + 1, true));
    carousel.addEventListener('mouseenter', stopAuto);
    carousel.addEventListener('mouseleave', scheduleAuto);
    carousel.addEventListener('focusin', stopAuto);
    carousel.addEventListener('focusout', (event) => {
      if (!carousel.contains(event.relatedTarget)) scheduleAuto();
    });
    carousel.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goTo(index - 1, true);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(index + 1, true);
      }
    });
    carousel.addEventListener('touchstart', (event) => {
      touchStartX = event.changedTouches[0]?.clientX ?? null;
      stopAuto();
    }, { passive: true });
    carousel.addEventListener('touchend', (event) => {
      const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
      const distance = touchStartX === null ? 0 : touchEndX - touchStartX;
      if (Math.abs(distance) > 48) goTo(index + (distance < 0 ? 1 : -1), true);
      else scheduleAuto();
      touchStartX = null;
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAuto();
      else scheduleAuto();
    });

    if ('IntersectionObserver' in window) {
      const carouselObserver = new IntersectionObserver((entries) => {
        carouselVisible = entries[0]?.isIntersecting ?? false;
        if (carouselVisible) scheduleAuto();
        else stopAuto();
      }, { threshold: .3 });
      carouselObserver.observe(carousel);
    }

    renderCarousel();
    scheduleAuto();
  });

  const counterNodes = [...document.querySelectorAll('[data-count-to]')];
  const setCounterValue = (node, value) => {
    const pad = Number(node.dataset.countPad || 1);
    node.textContent = String(value).padStart(pad, '0');
  };
  const animateCounter = (node) => {
    if (node.dataset.counted === 'true') return;
    node.dataset.counted = 'true';
    const target = Number(node.dataset.countTo || 0);
    if (reducedMotion) {
      setCounterValue(node, target);
      return;
    }
    const startedAt = performance.now();
    const duration = 1350;
    const tick = (time) => {
      const progressValue = Math.min((time - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progressValue, 3);
      setCounterValue(node, Math.round(target * eased));
      if (progressValue < 1) window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  };
  if (counterNodes.length) {
    if (!('IntersectionObserver' in window)) counterNodes.forEach(animateCounter);
    else {
      const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        });
      }, { threshold: .45 });
      counterNodes.forEach((node) => counterObserver.observe(node));
    }
  }

  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  const filterItems = [...document.querySelectorAll('[data-category]')];
  const filterStatus = document.querySelector('[data-filter-status]');
  const validFilters = new Set(['all', ...filterButtons.map((button) => button.dataset.filter)]);
  const applyFilter = (filter, historyMode = null) => {
    const activeFilter = validFilters.has(filter) ? filter : 'all';
    filterButtons.forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.filter === activeFilter)));
    filterItems.forEach((item) => {
      item.hidden = activeFilter !== 'all' && item.dataset.category !== activeFilter;
    });
    if (filterStatus) {
      const count = filterItems.filter((item) => !item.hidden).length;
      const label = filterButtons.find((item) => item.dataset.filter === activeFilter)?.textContent.trim() || '全部';
      filterStatus.textContent = `${label}：当前展示 ${count} 个内容场景`;
    }
    if (historyMode) {
      const url = new URL(window.location.href);
      if (activeFilter === 'all') url.searchParams.delete('industry');
      else url.searchParams.set('industry', activeFilter);
      window.history[historyMode]({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  };
  if (filterButtons.length) {
    applyFilter(new URL(window.location.href).searchParams.get('industry') || 'all');
    filterButtons.forEach((button) => {
      button.addEventListener('click', () => applyFilter(button.dataset.filter, 'pushState'));
    });
    window.addEventListener('popstate', () => {
      applyFilter(new URL(window.location.href).searchParams.get('industry') || 'all');
    });
  }

  document.querySelectorAll('[data-expand-list]').forEach((button) => {
    const list = document.getElementById(button.getAttribute('aria-controls'));
    if (!list) return;
    button.addEventListener('click', () => {
      const open = list.classList.toggle('is-expanded');
      button.setAttribute('aria-expanded', String(open));
      button.textContent = open ? '收起行业列表' : '展开全部行业';
    });
  });

  const sceneData = {
    'food-story': {
      number: '01', theme: 'red', label: 'FOOD / BRAND STORY',
      client: '华北某连锁餐饮品牌（匿名示意）', industry: '餐饮 · 品牌认知',
      title: '从门店细节建立品牌记忆',
      lead: '以真实经营细节为内容起点，建立稳定、有辨识度的门店表达。',
      background: '品牌拥有多家社区门店，但过往内容以促销信息为主，门店理念、产品标准和经营者故事没有形成统一表达。',
      need: '在不依赖现场拍摄团队的前提下，利用客户已有门店、产品和人物素材，形成可持续更新的品牌内容。',
      strategy: '先梳理“为什么开、如何做、顾客为什么回来”三条内容主线，再将已有素材拆分为门店细节、产品过程与经营者表达。',
      services: ['业务与品牌表达梳理', '选题、脚本与客户素材清单', '素材整理与视频后期', '配套图文及平台适配', '代发布与阶段复盘'],
      deliveries: ['品牌故事短片 × 1', '门店细节短视频 × 4', '系列图文 × 6', '发布排期与复盘简报 × 1'],
      results: [['31.8%', '示意完播率'], ['86', '示意咨询线索'], ['+24%', '示意品牌搜索提升']]
    },
    'food-product': {
      number: '02', theme: 'silver', label: 'FOOD / PRODUCT',
      client: '某精品烘焙品牌（匿名示意）', industry: '餐饮 · 产品种草',
      title: '把产品卖点变成可感知体验',
      lead: '把原料、工艺和食用场景转化成用户一眼能理解的内容。',
      background: '新品有清晰的原料与工艺优势，但原有内容集中展示成品图片，缺少过程、口感和消费场景的解释。',
      need: '围绕新品上市形成一组可连续发布的短视频与图文，并兼顾小红书搜索和抖音节奏。',
      strategy: '将抽象卖点拆成原料证据、制作过程、口感细节和搭配场景四类内容，以客户提供的产品素材完成多版本后期。',
      services: ['新品卖点提炼', '内容组合与脚本策划', '产品素材整理与精剪', '字幕、包装与系列封面', '小红书与抖音版本适配'],
      deliveries: ['新品揭幕片 × 1', '卖点短视频 × 5', '产品图文 × 5', '平台标题与发布文案 × 10'],
      results: [['42.6%', '示意互动提升'], ['12.4万', '示意内容曝光'], ['3.2%', '示意主页访问率']]
    },
    'consumer-launch': {
      number: '03', theme: 'light', label: 'PRODUCT / LAUNCH',
      client: '某国货家居品牌（匿名示意）', industry: '消费品牌 · 新品发布',
      title: '围绕新品建立统一表达',
      lead: '从一个核心利益点出发，让揭幕、演示和系列图文彼此呼应。',
      background: '新品资料齐全，但研发语言、销售语言和社媒表达并不统一，用户难以快速理解新品与旧款的区别。',
      need: '在上市首月建立统一的产品叙事，并为视频号、抖音和小红书准备不同信息密度的内容。',
      strategy: '以核心使用痛点为开场，用功能演示建立证据，再通过场景图文补充搜索信息，形成由认知到了解的内容路径。',
      services: ['新品信息与受众梳理', '上市内容节奏规划', '功能演示视频后期', '系列图文与封面系统', '多平台发布适配'],
      deliveries: ['新品主片 × 1', '功能演示 × 4', '场景短片 × 3', '系列图文 × 8'],
      results: [['18.7万', '示意首月曝光'], ['7.1%', '示意收藏率'], ['+19%', '示意站内搜索增长']]
    },
    'consumer-conversion': {
      number: '04', theme: 'red', label: 'PRODUCT / CONVERSION',
      client: '某个人护理品牌（匿名示意）', industry: '消费品牌 · 销售转化',
      title: '从核心利益点到行动引导',
      lead: '让卖点、证据、使用方法与购买理由在同一组内容中顺畅衔接。',
      background: '品牌已有大量产品素材与测评反馈，但内容信息分散，缺少针对转化节点的重新组织。',
      need: '在促销周期内，用现有素材形成一组兼顾信任解释和行动引导的内容。',
      strategy: '按用户决策顺序重组素材：先呈现痛点，再给出功能证据、使用方式和适用人群，最后加入清晰的活动信息。',
      services: ['转化路径与内容结构梳理', '素材筛选与口碑信息整理', '短视频后期与版本测试', '促销图文与标题文案', '发布排期与数据复盘'],
      deliveries: ['利益点短视频 × 4', '使用教程 × 3', 'FAQ短片 × 3', '促销图文 × 6'],
      results: [['2.6倍', '示意点击提升'], ['4.9%', '示意转化率'], ['-17%', '示意获客成本变化']]
    },
    'local-leads': {
      number: '05', theme: 'silver', label: 'LOCAL / LEADS',
      client: '某本地企业服务机构（匿名示意）', industry: '本地企业 · 获客留资',
      title: '用专业解释降低决策门槛',
      lead: '把服务流程、常见问题与客户顾虑讲清楚，让咨询发生得更自然。',
      background: '业务专业度高，但用户首次接触时不理解服务流程、适用条件与费用构成，销售需要重复解释。',
      need: '建立一套可长期使用的专业内容，让潜在客户在咨询前完成基础了解。',
      strategy: '围绕“适合谁、怎么做、需要多久、如何收费”建立FAQ内容，并在结尾设置明确但克制的咨询入口。',
      services: ['客户决策问题梳理', '专业解读脚本策划', '人物口播素材精剪', '预约咨询图文', '代发布与线索内容复盘'],
      deliveries: ['专业解读 × 6', 'FAQ短视频 × 6', '预约咨询图文 × 4', '线索内容复盘 × 1'],
      results: [['126', '示意有效留资'], ['+38%', '示意咨询转化提升'], ['-22%', '示意重复答疑时间']]
    },
    'knowledge-education': {
      number: '06', theme: 'light', label: 'KNOWLEDGE / EDUCATION',
      client: '某专业服务品牌（匿名示意）', industry: '其他行业 · 用户教育',
      title: '把复杂知识讲得清楚易懂',
      lead: '保留专业性，同时让非专业受众愿意看、能理解、记得住。',
      background: '团队拥有大量专业知识与内部资料，但原始表达过于书面，难以直接转化为社媒内容。',
      need: '把已有课程、演示文稿和专家口述素材整理成适合持续发布的知识内容。',
      strategy: '以一个问题对应一个结论，把长内容拆成概念解释、误区澄清、方法步骤和案例拆解四类栏目。',
      services: ['知识资料结构化整理', '栏目与选题体系', '长素材拆条与视频后期', '知识卡片与配套图文', '发布运营与内容复盘'],
      deliveries: ['知识短视频 × 12', '知识图文 × 8', '栏目视觉模板 × 1套', '月度复盘简报 × 1'],
      results: [['46.2%', '示意平均完播率'], ['+3,280', '示意新增关注'], ['8.6%', '示意收藏率']]
    }
  };

  const sceneDetail = document.querySelector('[data-scene-detail]');
  if (sceneDetail) {
    const requestedScene = new URL(window.location.href).searchParams.get('scene');
    const scene = sceneData[requestedScene] || sceneData['food-story'];
    const setText = (selector, value) => {
      const node = document.querySelector(selector);
      if (node) node.textContent = value;
    };
    const fillList = (selector, values) => {
      const node = document.querySelector(selector);
      if (!node) return;
      node.replaceChildren(...values.map((value) => {
        const item = document.createElement('li');
        item.textContent = value;
        return item;
      }));
    };
    setText('[data-scene-kicker]', scene.industry);
    setText('[data-scene-title]', scene.title);
    setText('[data-scene-lead]', scene.lead);
    setText('[data-scene-client]', scene.client);
    setText('[data-scene-industry]', scene.industry);
    setText('[data-scene-background]', scene.background);
    setText('[data-scene-need]', scene.need);
    setText('[data-scene-strategy]', scene.strategy);
    setText('[data-scene-cover-number]', scene.number);
    setText('[data-scene-cover-label]', scene.label);
    setText('[data-scene-cover-title]', scene.title);
    fillList('[data-scene-services]', scene.services);
    fillList('[data-scene-deliveries]', scene.deliveries);
    const cover = document.querySelector('[data-scene-cover]');
    if (cover) cover.classList.add(scene.theme);
    const results = document.querySelector('[data-scene-results]');
    if (results) {
      results.replaceChildren(...scene.results.map(([value, label]) => {
        const item = document.createElement('article');
        const strong = document.createElement('strong');
        const span = document.createElement('span');
        strong.textContent = value;
        span.textContent = label;
        item.append(strong, span);
        return item;
      }));
    }
    document.querySelectorAll('[data-scene-inquiry]').forEach((button) => {
      button.dataset.inquiryTopic = `${scene.industry}｜${scene.title}`;
    });
    document.title = `${scene.title}｜场景示例｜思徕`;
  }

  const CONTACT_EMAIL = 'zhanglei@slcm.com';
  const CONTACT_ENDPOINT = CONTACT_EMAIL ? `https://formsubmit.co/ajax/${CONTACT_EMAIL}` : '';
  const CONTACT_COOLDOWN = 60000;
  const CONTACT_STORAGE_KEY = 'siilai-contact-last-sent';

  document.querySelectorAll('[data-contact-email]').forEach((node) => {
    if (!CONTACT_EMAIL) return;
    const link = document.createElement('a');
    link.href = `mailto:${CONTACT_EMAIL}`;
    link.textContent = CONTACT_EMAIL;
    node.replaceChildren(link);
  });

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'modal-title');
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="modal-panel">
      <button class="modal-close" type="button" data-close-modal aria-label="关闭咨询表单">×</button>
      <div class="eyebrow">Start a conversation</div>
      <h2 id="modal-title">先聊业务，<br>再谈内容</h2>
      <p class="modal-context" data-inquiry-context>告诉我们业务目标和现有素材，即可开始。</p>
      <form class="lead-form" data-contact-form data-lead-form action="#" method="POST" aria-describedby="modal-note">
        <input type="hidden" name="_subject" value="思徕官网新咨询">
        <input type="hidden" name="_template" value="table">
        <input type="hidden" name="topic" data-inquiry-topic>
        <div class="anti-spam-field" aria-hidden="true"><label for="modal-website">请勿填写此字段</label><input id="modal-website" name="_honey" tabindex="-1" autocomplete="off"></div>
        <div class="field"><label for="modal-name">联系人 <em aria-hidden="true">*</em></label><input id="modal-name" name="name" autocomplete="name" required></div>
        <div class="field"><label for="modal-company">公司或品牌 <em aria-hidden="true">*</em></label><input id="modal-company" name="company" autocomplete="organization" required></div>
        <div class="field"><label for="modal-phone">手机号 <em aria-hidden="true">*</em></label><input id="modal-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" minlength="7" maxlength="24" required></div>
        <div class="field"><label for="modal-wechat">微信 <em aria-hidden="true">*</em></label><input id="modal-wechat" name="wechat" autocomplete="off" minlength="2" maxlength="40" required></div>
        <div class="field"><label for="modal-industry">所属行业 <em aria-hidden="true">*</em></label><select id="modal-industry" name="industry" required><option value="" selected disabled>请选择行业</option><option>餐饮</option><option>消费品牌</option><option>本地企业</option><option>其他行业</option></select></div>
        <div class="field"><label for="modal-budget">预算范围</label><select id="modal-budget" name="budget"><option value="" selected>暂不确定</option><option>1万元以内</option><option>1万–3万元</option><option>3万–8万元</option><option>8万元以上</option></select></div>
        <div class="field full"><label for="modal-need">当前内容需求</label><textarea id="modal-need" name="need" autocomplete="off" maxlength="1200" placeholder="例如：新品发布、门店获客、长期账号运营……"></textarea></div>
        <div class="privacy-consent field full"><input id="modal-privacy-consent" name="privacy_consent" type="checkbox" value="已同意" required><label for="modal-privacy-consent">我已阅读并同意<a href="privacy.html" target="_blank" rel="noopener">《隐私说明》</a>，允许思徕为回复咨询而使用以上信息。</label></div>
        <button class="button" type="submit">提交咨询</button>
        <p class="form-note" id="modal-note" data-form-status role="status" aria-live="polite">提交后我们将在1个工作日内回复。</p>
      </form>
      <aside class="wecom-contact" aria-label="企业微信咨询">
        <img src="assets/wecom-qr.png" alt="思徕企业微信二维码" width="278" height="294" loading="lazy">
        <div><small>WEcom / 企业微信</small><b>也可以扫码直接沟通</b><p>工作日 9:00–18:00，通常在1个工作日内回复。</p></div>
      </aside>
      <div class="modal-success" role="status" tabindex="-1"><small>MESSAGE SENT</small><h3>咨询已提交</h3><p>我们已收到你的信息，将在1个工作日内通过所留联系方式回复。</p></div>
    </div>`;
  document.body.appendChild(modal);

  const mobileInquiry = document.createElement('button');
  mobileInquiry.className = 'mobile-inquiry';
  mobileInquiry.type = 'button';
  mobileInquiry.textContent = '获取内容建议';
  mobileInquiry.setAttribute('aria-label', '打开内容咨询表单');
  document.body.appendChild(mobileInquiry);

  let returnFocus = null;
  const modalForm = modal.querySelector('[data-lead-form]');
  const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const openModal = (trigger) => {
    returnFocus = trigger;
    const topic = trigger?.dataset.inquiryTopic || '';
    modalForm.reset();
    modalForm.dataset.startedAt = String(Date.now());
    modal.querySelector('[data-inquiry-topic]').value = topic;
    modal.querySelector('[data-inquiry-context]').textContent = topic ? `当前关注：${topic}。告诉我们业务目标和现有素材即可。` : '告诉我们业务目标和现有素材，即可开始。';
    modal.classList.add('is-open');
    modal.classList.remove('is-sent');
    const modalStatus = modalForm.querySelector('[data-form-status]');
    modalStatus.className = 'form-note';
    modalStatus.textContent = CONTACT_EMAIL ? '提交后我们将在1个工作日内回复。' : '在线咨询渠道正在配置，正式启用后将在1个工作日内回复。';
    modal.setAttribute('aria-hidden', 'false');
    body.classList.add('modal-open');
    mobileInquiry.classList.remove('is-visible');
    if (window.matchMedia('(min-width: 769px)').matches) {
      window.setTimeout(() => modal.querySelector('input:not([type="hidden"])')?.focus(), 50);
    }
  };
  const inquiryCarousel = document.querySelector('[data-carousel]');
  let inquiryCarouselOnScreen = false;
  syncMobileInquiry = () => {
    if (window.innerWidth > 920) {
      mobileInquiry.classList.remove('is-visible');
      return;
    }
    const threshold = body.classList.contains('page-home') ? window.innerHeight * .72 : 240;
    let carouselOnScreen = inquiryCarouselOnScreen;
    if (inquiryCarousel && !('IntersectionObserver' in window)) {
      const carouselRect = inquiryCarousel.getBoundingClientRect();
      carouselOnScreen = carouselRect.bottom > 0 && carouselRect.top < window.innerHeight;
    }
    const visible = window.scrollY > threshold && !modal.classList.contains('is-open') && !carouselOnScreen;
    mobileInquiry.classList.toggle('is-visible', visible);
  };
  if (inquiryCarousel && 'IntersectionObserver' in window) {
    const inquiryCarouselObserver = new IntersectionObserver((entries) => {
      inquiryCarouselOnScreen = entries[0]?.isIntersecting ?? false;
      syncMobileInquiry();
    }, { threshold: 0 });
    inquiryCarouselObserver.observe(inquiryCarousel);
  }
  const closeModal = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    body.classList.remove('modal-open');
    syncMobileInquiry();
    returnFocus?.focus();
  };

  document.querySelectorAll('[data-open-inquiry]').forEach((button) => {
    button.addEventListener('click', () => openModal(button));
  });
  mobileInquiry.addEventListener('click', () => openModal(mobileInquiry));
  modal.querySelector('[data-close-modal]').addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (modal.classList.contains('is-open')) closeModal();
      else if (nav?.classList.contains('is-open')) setNavOpen(false);
    }
    if (event.key === 'Tab' && modal.classList.contains('is-open')) {
      const focusable = [...modal.querySelectorAll(focusableSelector)].filter((node) => node.offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  });
  const getLastSubmissionTime = () => {
    try {
      return Number(window.localStorage.getItem(CONTACT_STORAGE_KEY) || 0);
    } catch {
      return 0;
    }
  };
  const rememberSubmissionTime = () => {
    try {
      window.localStorage.setItem(CONTACT_STORAGE_KEY, String(Date.now()));
    } catch {
      // The request was still sent even when storage is unavailable.
    }
  };
  const setFormStatus = (form, state, message, includeEmail = false) => {
    const status = form.querySelector('[data-form-status]');
    if (!status) return;
    status.className = `form-note is-${state}`;
    status.textContent = message;
    if (includeEmail && CONTACT_EMAIL) {
      status.append(' ');
      const link = document.createElement('a');
      link.href = `mailto:${CONTACT_EMAIL}`;
      link.textContent = CONTACT_EMAIL;
      status.appendChild(link);
    }
  };
  const createContactPayload = (form) => {
    const data = new FormData(form);
    return {
      _subject: data.get('_subject') || '思徕官网新咨询',
      _template: 'table',
      _honey: data.get('_honey') || '',
      '咨询主题': data.get('topic') || '官网内容咨询',
      '公司或品牌': data.get('company') || '',
      '联系人': data.get('name') || '',
      '电话': data.get('phone') || '',
      '微信': data.get('wechat') || '',
      '所属行业': data.get('industry') || '',
      '预算范围': data.get('budget') || '暂不确定',
      '当前内容需求': data.get('need') || '未填写',
      '隐私同意': data.get('privacy_consent') ? '已同意' : '未同意',
      '来源页面': window.location.href,
      '提交时间': new Date().toLocaleString('zh-CN', { hour12: false })
    };
  };
  const submitContactForm = async (form) => {
    const button = form.querySelector('button[type="submit"]');
    const payload = createContactPayload(form);
    const startedAt = Number(form.dataset.startedAt || Date.now());

    if (!CONTACT_ENDPOINT) {
      setFormStatus(form, 'error', '在线咨询渠道尚未配置，请通过企业微信联系我们。');
      return;
    }
    if (payload._honey) {
      setFormStatus(form, 'success', '咨询已提交，我们将在1个工作日内回复。');
      return;
    }
    if (Date.now() - startedAt < 2200) {
      setFormStatus(form, 'error', '提交速度过快，请检查信息后稍候再试。');
      return;
    }
    const remaining = CONTACT_COOLDOWN - (Date.now() - getLastSubmissionTime());
    if (remaining > 0) {
      setFormStatus(form, 'error', `请勿重复提交，可在 ${Math.ceil(remaining / 1000)} 秒后重试。`);
      return;
    }
    if (window.location.protocol === 'file:') {
      setFormStatus(form, 'error', '当前通过本地文件打开，在线提交需要从本地服务器访问。也可直接邮件联系', true);
      return;
    }

    const originalLabel = button?.textContent || '提交咨询';
    if (button) {
      button.disabled = true;
      button.textContent = '正在发送…';
    }
    setFormStatus(form, 'loading', '正在安全提交，请稍候…');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false || result.success === 'false') {
        throw new Error(result.message || `HTTP ${response.status}`);
      }
      rememberSubmissionTime();
      form.reset();
      form.dataset.startedAt = String(Date.now());
      setFormStatus(form, 'success', '提交成功，我们将在1个工作日内回复。');
      if (form === modalForm) {
        modal.classList.add('is-sent');
        modal.querySelector('.modal-success')?.focus();
      }
    } catch (error) {
      const message = error?.name === 'AbortError' ? '提交超时，请检查网络后重试。也可直接邮件联系' : '提交未成功，请稍后重试。也可直接邮件联系';
      setFormStatus(form, 'error', message, true);
    } finally {
      window.clearTimeout(timeout);
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    }
  };

  document.querySelectorAll('[data-contact-form]').forEach((form) => {
    form.action = CONTACT_EMAIL ? `https://formsubmit.co/${CONTACT_EMAIL}` : '#';
    form.dataset.startedAt = String(Date.now());
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitContactForm(form);
    });
  });

  syncMobileInquiry();
  window.addEventListener('resize', scheduleScrollSync);
})();
