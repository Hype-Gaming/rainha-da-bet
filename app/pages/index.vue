<template>
    <div class="dashboard">
        <!-- Header -->
        <header class="header">
            <div class="header-left">
                <NuxtLink to="/">
                    <img
                        src="/logo.png"
                        alt="Rainha da Bet"
                        class="header-logo"
                    />
                </NuxtLink>
            </div>
            <div class="header-right">
                <div class="balance">
                    <Icon name="ph:wallet-bold" class="balance-icon" />
                    <span class="balance-value">{{ formattedBalance }}</span>
                    <Icon
                        name="ph:info"
                        class="balance-info"
                        @click="handleDepositClick"
                    />
                </div>
                <button class="btn-deposit" @click="handleDepositClick">
                    DEPOSITAR
                </button>
                <div class="profile-wrapper">
                    <div class="profile-icon" @click="toggleProfileDropdown">
                        <Icon name="ph:user-bold" />
                    </div>
                    <div class="profile-dropdown" v-if="showProfileDropdown">
                        <div class="dropdown-user" v-if="user">
                            <span class="user-name">{{
                                user?.name || "Usuário"
                            }}</span>
                            <span class="user-email">{{
                                user?.email || ""
                            }}</span>
                        </div>
                        <NuxtLink to="/gestao" class="dropdown-item" @click="guardRoute">
                            <Icon name="ph:calculator-bold" />
                            Gestão
                        </NuxtLink>
                        <NuxtLink to="/aulas" class="dropdown-item" @click="guardRoute">
                            <Icon name="ph:graduation-cap-bold" />
                            Aulas
                        </NuxtLink>
                        <button
                            v-if="isAuthenticated"
                            @click="handleLogout"
                            class="dropdown-item logout"
                        >
                            <Icon name="ph:sign-out-bold" />
                            <span>Sair</span>
                        </button>
                        <button v-else class="dropdown-item" @click="redirectToLogin">
                            <Icon name="ph:sign-in-bold" />
                            <span>Entrar</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <div class="main-content">
            <!-- Sidebar -->
            <aside class="sidebar">
                <button v-if="!isPaid" class="btn-confirmar-compra" @click="handleSubscriptionClick">
                    <Icon name="ph:lock-open-bold" />
                    Confirmar compra
                </button>

                <h2 class="sidebar-title">Notícias recentes</h2>

                <div class="news-card featured">
                    <div class="news-badge">ÚLTIMAS</div>
                    <h3 class="news-title-big">NOTÍCIAS</h3>
                </div>

                <NuxtLink
                    :to="news.external ? news.href : news.href || '#'"
                    :href="news.external ? news.href : undefined"
                    :target="news.external ? '_blank' : undefined"
                    :rel="news.external ? 'noopener noreferrer' : undefined"
                    :external="news.external"
                    class="news-item"
                    v-for="(news, index) in newsItems"
                    :key="index"
                    @click="handleNewsClick($event, news)"
                >
                    <div class="news-icon">
                        <Icon :name="news.icon" class="news-icon-svg" />
                    </div>
                    <div class="news-content">
                        <h4 class="news-title">{{ news.title }}</h4>
                        <p class="news-description">{{ news.description }}</p>
                    </div>
                </NuxtLink>
            </aside>

            <!-- Center Content -->
            <div class="center-content">
                <!-- Banner Carousel -->
                <div class="banner-carousel">
                    <button class="carousel-btn prev" @click="prevBanner">
                        <Icon name="ph:caret-left-bold" />
                    </button>
                    <div class="banner-slides">
                        <div
                            class="banner-slide"
                            v-for="(banner, index) in banners"
                            :key="index"
                            :class="{ active: currentBanner === index }"
                        >
                            <a
                                :href="banner.link"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="banner-link"
                            >
                                <img :src="banner.image" :alt="banner.alt" />
                            </a>
                        </div>
                    </div>
                    <button class="carousel-btn next" @click="nextBanner">
                        <Icon name="ph:caret-right-bold" />
                    </button>
                    <div class="carousel-dots">
                        <span
                            class="dot"
                            v-for="(banner, index) in banners"
                            :key="index"
                            :class="{ active: currentBanner === index }"
                            @click="currentBanner = index"
                        ></span>
                    </div>
                </div>

                <!-- IA Prime -->
                <div class="games-section">
                    <div class="games-header">
                        <h2 class="games-title">
                            <Icon
                                name="ph:sparkle-bold"
                                class="title-icon"
                            />
                            Inteligência Artificial Prime
                        </h2>
                    </div>
                    <div class="games-grid">
                        <a
                            v-for="(game, index) in primeGames"
                            :key="index"
                            :href="game.href"
                            class="game-card"
                            @click="guardRoute"
                        >
                            <div class="game-image">
                                <img
                                    :src="game.image"
                                    :alt="game.name"
                                    v-if="game.image"
                                />
                            </div>
                            <div class="game-info">
                                <h3 class="game-name">{{ game.name }}</h3>
                                <span
                                    class="game-provider"
                                    v-if="game.provider"
                                >
                                    <Icon
                                        name="ph:play-fill"
                                        class="provider-icon"
                                    />
                                    {{ game.provider }}
                                </span>
                            </div>
                        </a>
                    </div>
                </div>

                <!-- IA Premium -->
                <div class="games-section premium-section">
                    <div class="games-header">
                        <h2 class="games-title">
                            <Icon
                                name="ph:crown-bold"
                                class="title-icon title-icon-premium"
                            />
                            Inteligência Artificial Premium
                        </h2>
                    </div>
                    <div class="games-grid">
                        <a
                            v-for="(game, index) in premiumGames"
                            :key="index"
                            :href="isSubscribed ? `/jogo/${game.id}` : checkoutUrl"
                            :target="isSubscribed ? '_self' : '_blank'"
                            rel="noopener noreferrer"
                            class="game-card card-premium-locked"
                            :class="{ 'is-locked': !isPaid }"
                            @click="handleLockedGameClick($event, game.id)"
                        >
                            <div class="game-image">
                                <img
                                    :src="game.image"
                                    :alt="game.name"
                                    v-if="game.image"
                                />
                                <div v-if="!isPaid" class="permanent-lock premium-lock">
                                    <Icon name="ph:lock-key-fill" class="permanent-lock-icon" />
                                </div>
                            </div>
                            <div class="game-info">
                                <h3 class="game-name">{{ game.name }}</h3>
                                <span v-if="!isPaid" class="game-provider game-unlock">
                                    <Icon name="ph:lock-bold" class="provider-icon" />
                                    Desbloquear acesso
                                </span>
                                <span v-else class="game-provider game-unlocked">
                                    <Icon name="ph:play-fill" class="provider-icon" />
                                    Acessar agora
                                </span>
                            </div>
                        </a>
                    </div>
                </div>

                <!-- IA Claude -->
                <div class="games-section claude-section">
                    <div class="games-header">
                        <h2 class="games-title">
                            <Icon
                                name="ph:lightning-fill"
                                class="title-icon title-icon-claude"
                            />
                            IA Claude – Operações Sem Gale
                        </h2>
                    </div>
                    <div class="games-grid">
                        <a
                            v-for="(game, index) in claudeGames"
                            :key="index"
                            :href="isSubscribed ? `/jogo/${game.id}` : game.checkoutUrl"
                            :target="isSubscribed ? '_self' : '_blank'"
                            rel="noopener noreferrer"
                            class="game-card card-claude-locked"
                            :class="{ 'is-locked': !isPaid }"
                            @click="handleLockedGameClick($event, game.id)"
                        >
                            <div class="game-image">
                                <img
                                    :src="game.image"
                                    :alt="game.name"
                                    v-if="game.image"
                                />
                                <div v-if="!isPaid" class="permanent-lock claude-lock">
                                    <Icon name="ph:lock-key-fill" class="permanent-lock-icon" />
                                </div>
                            </div>
                            <div class="game-info">
                                <h3 class="game-name">{{ game.name }}</h3>
                                <span v-if="!isPaid" class="game-provider game-unlock">
                                    <Icon name="ph:lock-bold" class="provider-icon" />
                                    Desbloquear acesso
                                </span>
                                <span v-else class="game-provider game-unlocked">
                                    <Icon name="ph:play-fill" class="provider-icon" />
                                    Acessar agora
                                </span>
                            </div>
                        </a>
                    </div>
                </div>

                <!-- Links Úteis -->
                <div class="links-section">
                    <h2 class="section-title">Links úteis</h2>
                    <div class="links-grid">
                        <NuxtLink
                            v-for="(link, index) in usefulLinks"
                            :key="index"
                            :to="link.external ? link.href : link.href || '#'"
                            :href="link.external ? link.href : undefined"
                            :target="link.external ? '_blank' : undefined"
                            :rel="
                                link.external
                                    ? 'noopener noreferrer'
                                    : undefined
                            "
                            :external="link.external"
                            class="link-card"
                            :class="{ 'link-active': link.active }"
                            @click="handleUsefulLinkClick($event, link)"
                        >
                            <Icon :name="link.icon" class="link-icon" />
                            <span class="link-text">{{ link.name }}</span>
                        </NuxtLink>
                    </div>
                </div>

                <!-- Destaques -->
                <div class="highlights-section">
                    <div class="highlights-header">
                        <h2 class="section-title">Destaques</h2>
                        <div class="highlights-nav">
                            <button class="nav-btn">
                                <Icon name="ph:caret-left-bold" />
                            </button>
                            <button class="nav-btn">
                                <Icon name="ph:caret-right-bold" />
                            </button>
                        </div>
                    </div>
                    <div class="highlights-grid">
                        <NuxtLink
                            :to="highlight.href || '#'"
                            class="highlight-card"
                            v-for="(highlight, index) in highlights"
                            :key="index"
                            @click="guardRoute"
                        >
                            <img :src="highlight.image" :alt="highlight.name" />
                        </NuxtLink>
                    </div>
                </div>
            </div>
        </div>

        <!-- Deposit Modal -->
        <DepositModal />

        <!-- Subscription Modal -->
        <!-- Pop-up de desbloqueio de assinatura desativado a pedido (será removido).
             Usuários não pagos agora vão direto para a Lastlink ao clicar em jogo pago. -->
        <!-- <SubscriptionModal /> -->

        <!-- Grupo VIP Modal -->
        <Teleport to="body">
            <div
                v-if="showGrupoModal"
                class="grupo-modal-overlay"
                @click="closeGrupoModal"
            >
                <div class="grupo-modal" @click.stop>
                    <button class="grupo-modal-close" @click="closeGrupoModal">
                        <Icon name="ph:x-bold" />
                    </button>
                    <a
                        :href="socialLinks.whatsapp"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="grupo-banner-link"
                        @click="closeGrupoModal"
                    >
                        <img
                            src="/banners/ENTRE-NA-MINHA-COMUNIDADE-DUDA.png"
                            alt="Entre na minha comunidade"
                            class="grupo-banner-img"
                        />
                    </a>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { CHECKOUT_URLS } from "../constants/checkoutLinks";

definePageMeta({
    layout: "default",
});

const { user, logout, isAuthenticated, formattedBalance, fetchUserProfile } =
    useAuth();
const { openModal: openDepositModal } = useDeposit();
const {
    isSubscribed,
    isPaid,
    init: initSubscription,
} = useSubscription();

const checkoutUrl = CHECKOUT_URLS.main;
const socialLinks = {
    whatsapp: "https://chat.whatsapp.com/LtELxASK4F07hY2GShxVAv?s=cl&p=i&ilr=1",
    instagram: "https://www.instagram.com/mariainvest_/",
    telegram: "https://t.me/+bL3Px9mB3oJkNzdh",
};

const refreshSubscriptionAccess = async (force = false) => {
    if (!isAuthenticated.value) return;
    await initSubscription(user.value?.email || null, { force });
};

const handleWindowFocus = () => {
    refreshSubscriptionAccess(true);
};

// Atualizar balance e verificar assinatura ao montar a página
onMounted(() => {
    if (isAuthenticated.value) {
        fetchUserProfile();
    }
    refreshSubscriptionAccess();

    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("pageshow", handleWindowFocus);
});

const banners = ref([
    {
        image: "/banners/ENTRE-NA-MINHA-COMUNIDADE-DUDA.png",
        alt: "Entre na minha comunidade",
        link: socialLinks.whatsapp,
    },
]);

const currentBanner = ref(0);
const showProfileDropdown = ref(false);

const toggleProfileDropdown = () => {
    if (!isAuthenticated.value) {
        redirectToLogin();
        return;
    }
    showProfileDropdown.value = !showProfileDropdown.value;
};

const redirectToLogin = () => {
    showProfileDropdown.value = false;
    return navigateTo("/auth/login");
};

const requireAuth = (event?: Event) => {
    if (isAuthenticated.value) return true;
    event?.preventDefault();
    redirectToLogin();
    return false;
};

const guardRoute = (event: Event) => {
    requireAuth(event);
};

const handleDepositClick = () => {
    if (!requireAuth()) return;
    openDepositModal();
};

const handleSubscriptionClick = () => {
    if (!requireAuth()) return;
    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
};

const handleNewsClick = (event: Event, news: { href?: string; external?: boolean }) => {
    if (news.external) return;

    const href = news.href || "#";
    if (href === "#") {
        event.preventDefault();
    }

    requireAuth(event);
};

const handleUsefulLinkClick = (event: Event, link: { href?: string; external?: boolean }) => {
    if (link.external) return;

    const href = link.href || "#";
    if (href === "#") {
        event.preventDefault();
    }

    requireAuth(event);
};

// Fechar dropdown ao clicar fora
const closeDropdown = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".profile-wrapper")) {
        showProfileDropdown.value = false;
    }
};

const handleLogout = async () => {
    showProfileDropdown.value = false;
    await logout();
};

const nextBanner = () => {
    currentBanner.value = (currentBanner.value + 1) % banners.value.length;
};

const prevBanner = () => {
    currentBanner.value =
        currentBanner.value === 0
            ? banners.value.length - 1
            : currentBanner.value - 1;
};

// Auto-slide every 5 seconds
onMounted(() => {
    setInterval(() => {
        nextBanner();
    }, 5000);
    document.addEventListener("click", closeDropdown);
});

onUnmounted(() => {
    document.removeEventListener("click", closeDropdown);
    window.removeEventListener("focus", handleWindowFocus);
    window.removeEventListener("pageshow", handleWindowFocus);
});

const newsItems = ref([
    {
        title: "Nova estratégia liberada",
        description:
            "Entrou no ar uma nova estratégia para o jogo Evolution Gaming!",
        icon: "ph:lightning-bold",
        href: "#",
    },
    {
        title: "Novo Canal de Lives",
        description:
            "Confira o novo canal de lives com análises em tempo real.",
        icon: "ph:video-camera-bold",
        href: socialLinks.telegram,
        external: true,
    },
    {
        title: "Atualização nas odds",
        description:
            "Veja o novo ajuste nas odds do Evolution Gaming. Aproveite!",
        icon: "ph:chart-line-up-bold",
        href: "#",
    },
    {
        title: "Comunidade WhatsApp",
        description: "Participe da nossa comunidade exclusiva no WhatsApp.",
        icon: "ph:whatsapp-logo-bold",
        href: socialLinks.whatsapp,
        external: true,
    },
    {
        title: "Aprenda a Operar",
        description: "Confira as melhores estratégias para começar a operar.",
        icon: "ph:graduation-cap-bold",
        href: "/aulas",
    },
]);

const primeGames = ref([
    {
        id: "football-studio",
        name: "FOOTBALL STUDIO",
        provider: "Evolution",
        image: "/games/football-studio.png",
        href: "/jogo/football-studio",
    },
]);

const premiumGames = ref([
    {
        id: "bac-bo-en",
        name: "BAC BO EN",
        image: "/games/bac-bo-en.png",
    },
    {
        id: "bac-bo-brasileiro",
        name: "BAC BO BRASILEIRO",
        image: "/games/bac-bo-ao-vivo.png",
    },
    {
        id: "football-studio-ao-vivo",
        name: "FUTEBOL STUDIO AO VIVO",
        image: "/games/football-studio-br.png",
    },
    {
        id: "football-studio",
        name: "FOOTBALL STUDIO",
        image: "/games/football-studio.png",
    },
    {
        id: "baccarat",
        name: "BACCARAT",
        image: "/games/baccarat.png",
    },
    {
        id: "dragon-tiger",
        name: "DRAGON TIGER",
        image: "/games/dragon-tiger.png",
    },
    {
        id: "aviator",
        name: "AVIATOR",
        image: "/games/aviator.png",
    },
]);

const claudeGames = ref([
    {
        id: "football-studio",
        name: "FOOTBALL STUDIO ENGLISH",
        image: "/games/football-studio.png",
        checkoutUrl: CHECKOUT_URLS.legacySemGale,
    },
]);

const showGrupoModal = ref(false);
const openGrupoModal = () => {
    showGrupoModal.value = true;
};
const closeGrupoModal = () => {
    showGrupoModal.value = false;
};

const handleLockedGameClick = (event: MouseEvent, gameId: string) => {
    event.preventDefault();

    if (!requireAuth(event)) return;

    if (isSubscribed.value) {
        navigateTo(`/jogo/${gameId}`);
        return;
    }

    const game = claudeGames.value.find((item) => item.id === gameId);
    const lockedCheckoutUrl = game?.checkoutUrl || checkoutUrl;
    window.open(lockedCheckoutUrl, "_blank", "noopener,noreferrer");
};

const usefulLinks = ref([
    {
        name: "Gestão de Banca",
        icon: "ph:calculator-bold",
        active: false,
        href: "/gestao",
    },
    {
        name: "Aulas",
        icon: "ph:graduation-cap-bold",
        active: false,
        href: "/aulas",
    },
    {
        name: "WhatsApp",
        icon: "ph:whatsapp-logo-bold",
        active: false,
        href: socialLinks.whatsapp,
        external: true,
    },
    {
        name: "Instagram",
        icon: "ph:instagram-logo-bold",
        active: false,
        href: socialLinks.instagram,
        external: true,
    },
    {
        name: "Telegram",
        icon: "ph:telegram-logo-bold",
        active: false,
        href: socialLinks.telegram,
        external: true,
    },
]);

const highlights = ref([
    { name: "Aprenda a Operar", image: "/cards/operar.png", href: "/aulas" },
    {
        name: "Gestão de Banca",
        image: "/cards/gestaodebanca.png",
        href: "/gestao",
    },
]);
</script>

<style scoped>
.dashboard {
    min-height: 100vh;
    background-color: #0a0a0a;
    color: #ffffff;
}

/* Header */
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 24px;
    background-color: #111111;
    border-bottom: 1px solid #222222;
    position: sticky;
    top: 0;
    z-index: 100;
}

.header-logo {
    height: 40px;
    width: auto;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 16px;
}

.balance {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background-color: #1a1a1a;
    border-radius: 8px;
    border: 1px solid #333333;
}

.balance-icon {
    font-size: 18px;
    color: #fb65a6;
}

.balance-value {
    color: #fb65a6;
    font-weight: 600;
}

.balance-info {
    font-size: 16px;
    color: #666666;
    cursor: pointer;
    transition: color 0.2s;
}

.balance-info:hover {
    color: #fb65a6;
}

.btn-deposit {
    padding: 12px 24px;
    background: linear-gradient(135deg, #fb65a6 0%, #fb65a6 100%);
    border: none;
    border-radius: 8px;
    color: #000000;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-deposit:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(251, 101, 166, 0.4);
}

.profile-wrapper {
    position: relative;
}

.profile-icon {
    width: 42px;
    height: 42px;
    background: linear-gradient(135deg, #fb65a6 0%, #fb65a6 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 18px;
    transition: transform 0.2s ease;
}

.profile-icon:hover {
    transform: scale(1.05);
}

.profile-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    min-width: 160px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    z-index: 200;
    animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.dropdown-user {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 16px;
    border-bottom: 1px solid #333;
}

.user-name {
    font-size: 14px;
    font-weight: 600;
    color: #fff;
}

.user-email {
    font-size: 12px;
    color: #888;
}

.dropdown-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    color: #fff;
    text-decoration: none;
    font-size: 14px;
    transition: background 0.2s ease;
    background: none;
    border: none;
    width: 100%;
    cursor: pointer;
}

.dropdown-item:hover {
    background: #222;
}

.dropdown-item.logout {
    color: #ef4444;
}

.dropdown-item.logout:hover {
    background: rgba(239, 68, 68, 0.1);
}

/* Main Content */
.main-content {
    display: flex;
    padding: 24px;
    gap: 24px;
}

/* Sidebar */
.sidebar {
    width: 280px;
    flex-shrink: 0;
}

.btn-confirmar-compra {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px 16px;
    background: rgba(251, 101, 166, 0.08);
    border: 1px solid rgba(251, 101, 166, 0.3);
    border-radius: 10px;
    color: #fb65a6;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 20px;
    transition: all 0.2s ease;
}

.btn-confirmar-compra:hover {
    background: rgba(251, 101, 166, 0.15);
    border-color: #fb65a6;
}

.sidebar-title {
    color: #fb65a6;
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 16px;
}

.news-card.featured {
    background: linear-gradient(135deg, #2a0018 0%, #3c0024 100%);
    border: 1px solid #fb65a6;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 16px;
    text-align: center;
}

.news-badge {
    color: #fb65a6;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 4px;
}

.news-title-big {
    font-size: 28px;
    font-weight: 800;
    color: #ffffff;
    text-shadow: 0 0 20px rgba(251, 101, 166, 0.3);
}

.news-item {
    display: flex;
    gap: 12px;
    padding: 14px;
    background-color: #141414;
    border-radius: 10px;
    margin-bottom: 10px;
    border: 1px solid #222222;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
}

.news-item:hover {
    border-color: #fb65a6;
    background-color: #1a1a1a;
}

.news-icon {
    width: 48px;
    height: 48px;
    background-color: #222222;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.news-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
}

.news-icon-svg {
    font-size: 24px;
    color: #fb65a6;
}

.news-content {
    flex: 1;
}

.news-title {
    color: #fb65a6;
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 4px 0;
}

.news-description {
    color: #888888;
    font-size: 12px;
    margin: 0;
    line-height: 1.4;
}

/* Center Content */
.center-content {
    flex: 1;
}

/* Banner Carousel */
.banner-carousel {
    position: relative;
    border-radius: 16px;
    overflow: hidden;
    margin-bottom: 32px;
}

.banner-slides {
    position: relative;
    width: 100%;
}

.banner-slide {
    display: none;
    width: 100%;
    aspect-ratio: 3 / 1;
    background: #03060b;
}

.banner-slide.active {
    display: block;
}

.banner-slide img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.banner-link {
    display: block;
    width: 100%;
    height: 100%;
    cursor: pointer;
}

.carousel-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 48px;
    height: 48px;
    background-color: rgba(0, 0, 0, 0.5);
    border: 1px solid #444444;
    border-radius: 50%;
    color: #ffffff;
    font-size: 24px;
    cursor: pointer;
    z-index: 3;
    transition: all 0.2s ease;
}

.carousel-btn:hover {
    background-color: rgba(251, 101, 166, 0.3);
    border-color: #fb65a6;
}

.carousel-btn.prev {
    left: 16px;
}

.carousel-btn.next {
    right: 16px;
}

.carousel-dots {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
    z-index: 3;
}

.dot {
    width: 10px;
    height: 10px;
    background-color: rgba(255, 255, 255, 0.4);
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
}

.dot.active {
    width: 24px;
    border-radius: 5px;
    background-color: #ffffff;
}

/* Games Section */
.games-section {
    margin-top: 24px;
}

.games-section + .games-section {
    margin-top: 40px;
}

.games-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.games-title {
    font-size: 20px;
    font-weight: 600;
    color: #ffffff;
    display: flex;
    align-items: center;
    gap: 10px;
}

.title-icon {
    font-size: 24px;
    color: #fb65a6;
}

.games-nav {
    display: flex;
    gap: 8px;
}

.nav-btn {
    width: 36px;
    height: 36px;
    background-color: #1a1a1a;
    border: 1px solid #333333;
    border-radius: 8px;
    color: #888888;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.nav-btn:hover {
    border-color: #fb65a6;
    color: #fb65a6;
}

.games-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 16px;
}

.game-card {
    background-color: #141414;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #222222;
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    display: block;
}

.game-card:hover {
    border-color: #fb65a6;
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(251, 101, 166, 0.2);
}

.game-image {
    position: relative;
    aspect-ratio: 3 / 4;
    overflow: hidden;
    background-color: #141414;
}

.game-image img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
}

.card-locked {
    border-color: #353535;
}

.card-locked .game-image img {
    filter: grayscale(35%);
    transform: scale(1.01);
}

.locked-dim {
    position: absolute;
    inset: 0;
    background: linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.2) 0%,
        rgba(0, 0, 0, 0.65) 100%
    );
    pointer-events: none;
}

.lock-badge-corner {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid rgba(251, 101, 166, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    backdrop-filter: blur(3px);
}

.lock-icon-corner {
    font-size: 16px;
    color: #fb65a6;
}

.game-unlock {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    color: #f7c2da;
    font-size: 12px;
    font-weight: 600;
}

.unlock-icon {
    font-size: 12px;
    color: #fb65a6;
}

.game-info {
    padding: 14px;
}

.game-name {
    font-size: 14px;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 4px 0;
}

.game-provider {
    font-size: 11px;
    color: #888888;
    display: flex;
    align-items: center;
    gap: 4px;
}

.provider-icon {
    font-size: 10px;
    color: #fb65a6;
}

/* Permanent Lock (Premium / Claude) */
.permanent-lock {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(6px);
    z-index: 2;
}

.permanent-lock-icon {
    font-size: 20px;
    color: #ffffff;
}

.premium-lock {
    background: linear-gradient(135deg, rgba(255, 193, 7, 0.95) 0%, rgba(255, 140, 0, 0.95) 100%);
    box-shadow: 0 4px 14px rgba(255, 140, 0, 0.45);
}

.claude-lock {
    background: linear-gradient(135deg, rgba(200, 120, 255, 0.95) 0%, rgba(140, 80, 230, 0.95) 100%);
    box-shadow: 0 4px 14px rgba(140, 80, 230, 0.45);
}

.game-unlocked {
    color: #10b981;
}

/* Premium cards */
.card-premium-locked .game-image {
    background: linear-gradient(135deg, #1a1405 0%, #2a1f08 100%);
    position: relative;
}

.card-premium-locked .game-image::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.55) 100%);
    pointer-events: none;
}

.card-premium-locked.is-locked .game-image img {
    opacity: 0.34;
}

.card-premium-locked:hover {
    border-color: #ffb000;
    box-shadow: 0 8px 25px rgba(255, 176, 0, 0.25);
}

.title-icon-premium {
    color: #ffb000;
}

/* Claude cards */
.card-claude-locked .game-image {
    background: linear-gradient(135deg, #14091f 0%, #221035 100%);
    position: relative;
}

.card-claude-locked .game-image::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.55) 100%);
    pointer-events: none;
}

.card-claude-locked.is-locked .game-image img {
    opacity: 0.34;
}

.card-claude-locked:hover {
    border-color: #c878ff;
    box-shadow: 0 8px 25px rgba(200, 120, 255, 0.25);
}

.title-icon-claude {
    color: #c878ff;
}

.game-unlock {
    color: #888888;
}

/* Links Úteis */
.links-section {
    margin-top: 40px;
}

.section-title {
    font-size: 18px;
    font-weight: 600;
    color: #fb65a6;
    margin: 0 0 16px 0;
}

.links-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
}

.link-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    background-color: #141414;
    border: 1px solid #222222;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
}

.link-card:hover {
    border-color: #fb65a6;
    background-color: #1a1a1a;
}

.link-card.link-active {
    background: linear-gradient(135deg, #fb65a6 0%, #00aa44 100%);
    border-color: transparent;
}

.link-card.link-active .link-icon,
.link-card.link-active .link-text {
    color: #000000;
}

.link-icon {
    font-size: 20px;
    color: #fb65a6;
}

.link-text {
    font-size: 14px;
    font-weight: 500;
    color: #ffffff;
}

/* Destaques */
.highlights-section {
    margin-top: 40px;
}

.highlights-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.highlights-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 16px;
}

.highlight-card {
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #222222;
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    display: block;
}

.highlight-card:hover {
    border-color: #fb65a6;
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(251, 101, 166, 0.2);
}

.highlight-card img {
    width: 100%;
    height: auto;
    display: block;
}

/* Responsive */
@media (max-width: 1024px) {
    .main-content {
        flex-direction: column;
    }

    .sidebar {
        width: 100%;
        order: 2;
    }

    .center-content {
        order: 1;
    }

    .banner-content h1 {
        font-size: 36px;
    }

    .banner-content h2 {
        font-size: 20px;
    }
}

@media (max-width: 640px) {
    .header {
        padding: 12px 16px;
    }

    .header-logo {
        height: 42px;
    }

    .header-right {
        gap: 10px;
    }

    .balance {
        padding: 8px 12px;
    }

    .btn-deposit {
        padding: 10px 16px;
        font-size: 12px;
    }

    .main-content {
        padding: 16px;
    }

    .carousel-btn {
        width: 32px;
        height: 32px;
        font-size: 16px;
    }

    .carousel-btn.prev {
        left: 8px;
    }

    .carousel-btn.next {
        right: 8px;
    }

    .games-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .links-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .link-card {
        padding: 12px 14px;
    }

    .link-text {
        font-size: 12px;
    }

    .highlights-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* Grupo VIP Modal */
.grupo-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
}

.grupo-modal {
    position: relative;
    max-width: 500px;
    width: 100%;
    border-radius: 16px;
    overflow: hidden;
    animation: modalIn 0.3s ease;
}

@keyframes modalIn {
    from {
        opacity: 0;
        transform: scale(0.9);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

.grupo-modal-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 36px;
    height: 36px;
    background: rgba(0, 0, 0, 0.6);
    border: none;
    border-radius: 50%;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    z-index: 10;
    transition: background 0.2s;
}

.grupo-modal-close:hover {
    background: rgba(0, 0, 0, 0.8);
}

.grupo-banner-link {
    display: block;
    width: 100%;
}

.grupo-banner-img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 16px;
}
</style>
