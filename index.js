/**
 * =========================================================================
 * BASTION.JS — Bibliothèque SDK Officielle pour Bots BASTION
 * Moteur haute performance Gateway WebSocket & REST v10
 * =========================================================================
 */

const EventEmitter = require('events');
const http = require('http');
const https = require('https');
const { URL } = require('url');

// Tentative d'import du module WebSocket externe ou utilisation de globalThis.WebSocket (Node 18+)
let WebSocketClient = null;
try {
    WebSocketClient = require('ws');
} catch (e) {
    if (typeof globalThis.WebSocket !== 'undefined') {
        WebSocketClient = globalThis.WebSocket;
    }
}

// Constantes & Enums
const GatewayIntentBits = {
    Guilds: 1 << 0,
    GuildMembers: 1 << 1,
    GuildModeration: 1 << 2,
    GuildEmojisAndStickers: 1 << 3,
    GuildIntegrations: 1 << 4,
    GuildWebhooks: 1 << 5,
    GuildInvites: 1 << 6,
    GuildVoiceStates: 1 << 7,
    GuildPresences: 1 << 8,
    GuildMessages: 1 << 9,
    GuildMessageReactions: 1 << 10,
    GuildMessageTyping: 1 << 11,
    DirectMessages: 1 << 12,
    DirectMessageReactions: 1 << 13,
    DirectMessageTyping: 1 << 14,
    MessageContent: 1 << 15,
    GuildScheduledEvents: 1 << 16,
    AutoModerationConfiguration: 1 << 20,
    AutoModerationExecution: 1 << 21,
    GuildExpressions: 1 << 22
};

const Partials = {
    User: 1,
    Channel: 2,
    GuildMember: 3,
    Message: 4,
    Reaction: 5,
    ScheduledEvent: 6,
    ThreadMember: 7
};

const Events = {
    ClientReady: 'ready',
    GuildCreate: 'guildCreate',
    GuildDelete: 'guildDelete',
    GuildUpdate: 'guildUpdate',
    GuildMemberAdd: 'guildMemberAdd',
    GuildMemberRemove: 'guildMemberRemove',
    GuildMemberUpdate: 'guildMemberUpdate',
    ChannelCreate: 'channelCreate',
    ChannelDelete: 'channelDelete',
    ChannelUpdate: 'channelUpdate',
    MessageCreate: 'messageCreate',
    MessageDelete: 'messageDelete',
    MessageUpdate: 'messageUpdate',
    InteractionCreate: 'interactionCreate',
    Error: 'error',
    Warn: 'warn'
};

const ButtonStyle = {
    Primary: 1,
    Secondary: 2,
    Success: 3,
    Danger: 4,
    Link: 5
};

const ComponentType = {
    ActionRow: 1,
    Button: 2,
    StringSelect: 3,
    UserSelect: 5,
    RoleSelect: 6,
    MentionableSelect: 7,
    ChannelSelect: 8
};

const ApplicationCommandType = {
    ChatInput: 1,
    User: 2,
    Message: 3
};

const MessageFlags = {
    Crossposted: 1 << 0,
    IsCrosspost: 1 << 1,
    SuppressEmbeds: 1 << 2,
    SourceMessageDeleted: 1 << 3,
    Urgent: 1 << 4,
    HasThread: 1 << 5,
    Ephemeral: 1 << 6,
    Loading: 1 << 7,
    FailedToMentionSomeRolesInThread: 1 << 8,
    SuppressNotifications: 1 << 12,
    IsVoiceMessage: 1 << 13
};

// Collection helper (Map étendue haute performance)
class Collection extends Map {
    find(fn) {
        for (const [key, val] of this) {
            if (fn(val, key, this)) return val;
        }
        return undefined;
    }
    filter(fn) {
        const results = new Collection();
        for (const [key, val] of this) {
            if (fn(val, key, this)) results.set(key, val);
        }
        return results;
    }
    map(fn) {
        const results = [];
        for (const [key, val] of this) {
            results.push(fn(val, key, this));
        }
        return results;
    }
}

// HTTP Helper Request
function httpRequest(urlStr, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(urlStr);
        const isHttps = parsed.protocol === 'https:';
        const client = isHttps ? https : http;

        const bodyData = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : null;

        const reqHeaders = {
            'User-Agent': 'BastionBot/1.0',
            ...headers
        };
        if (bodyData && !reqHeaders['Content-Type']) {
            reqHeaders['Content-Type'] = 'application/json';
            reqHeaders['Content-Length'] = Buffer.byteLength(bodyData);
        }

        const options = {
            hostname: parsed.hostname,
            port: parsed.port || (isHttps ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method,
            headers: reqHeaders
        };

        const req = client.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const json = body ? JSON.parse(body) : null;
                        resolve(json);
                    } catch (e) {
                        resolve(body);
                    }
                } else {
                    let errMsg = body;
                    try {
                        const parsedErr = JSON.parse(body);
                        errMsg = parsedErr.error || parsedErr.message || body;
                    } catch (e) {}
                    const err = new Error(`HTTP ${res.statusCode}: ${errMsg}`);
                    err.status = res.statusCode;
                    reject(err);
                }
            });
        });

        req.on('error', reject);
        if (bodyData) req.write(bodyData);
        req.end();
    });
}

// REST Client BASTION v10
class REST {
    constructor(options = {}) {
        this.token = null;
        this.apiBase = options.apiBase || process.env.BASTION_API_URL || 'http://localhost:8080/api/v10';
    }

    setToken(token) {
        this.token = token ? token.trim().replace(/^["'](.+)["']$/, '$1') : null;
        return this;
    }

    async request(method, path, options = {}) {
        const url = this.apiBase.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path);
        const headers = {
            'Authorization': `Bot ${this.token}`,
            ...(options.headers || {})
        };
        return await httpRequest(url, method, options.body, headers);
    }

    get(path, options) { return this.request('GET', path, options); }
    post(path, options) { return this.request('POST', path, options); }
    put(path, options) { return this.request('PUT', path, options); }
    patch(path, options) { return this.request('PATCH', path, options); }
    delete(path, options) { return this.request('DELETE', path, options); }
}

const Routes = {
    applicationCommands: (appId) => `/applications/${appId}/commands`,
    applicationGuildCommands: (appId, guildId) => `/applications/${appId}/guilds/${guildId}/commands`,
    channelMessages: (chId) => `/channels/${chId}/messages`,
    channelMessage: (chId, msgId) => `/channels/${chId}/messages/${msgId}`,
    guild: (guildId) => `/guilds/${guildId}`,
    guildMembers: (guildId) => `/guilds/${guildId}/members`,
    guildMember: (guildId, userId) => `/guilds/${guildId}/members/${userId}`,
    interactionCallback: (id, token) => `/interactions/${id}/${token}/callback`,
    webhookMessageOriginal: (appId, token) => `/webhooks/${appId}/${token}/messages/@original`
};

// Builders
class EmbedBuilder {
    constructor(data = {}) {
        this.data = {
            title: data.title || null,
            description: data.description || null,
            color: data.color || null,
            fields: data.fields || [],
            author: data.author || null,
            footer: data.footer || null,
            thumbnail: data.thumbnail || null,
            image: data.image || null,
            timestamp: data.timestamp || null
        };
    }

    setTitle(title) { this.data.title = title; return this; }
    setDescription(desc) { this.data.description = desc; return this; }
    setColor(color) {
        if (typeof color === 'string') {
            this.data.color = parseInt(color.replace('#', ''), 16);
        } else {
            this.data.color = color;
        }
        return this;
    }
    addFields(...fields) {
        const flattened = fields.flat();
        this.data.fields.push(...flattened);
        return this;
    }
    setAuthor(author) { this.data.author = author; return this; }
    setFooter(footer) { this.data.footer = footer; return this; }
    setThumbnail(url) { this.data.thumbnail = { url }; return this; }
    setImage(url) { this.data.image = { url }; return this; }
    setTimestamp(date = new Date()) {
        this.data.timestamp = date instanceof Date ? date.toISOString() : date;
        return this;
    }
    toJSON() { return this.data; }
}

class ButtonBuilder {
    constructor(data = {}) {
        this.data = {
            type: ComponentType.Button,
            style: data.style || ButtonStyle.Secondary,
            label: data.label || null,
            custom_id: data.custom_id || data.customId || null,
            url: data.url || null,
            disabled: Boolean(data.disabled),
            emoji: data.emoji || null
        };
    }

    setCustomId(id) { this.data.custom_id = id; return this; }
    setLabel(label) { this.data.label = label; return this; }
    setStyle(style) { this.data.style = style; return this; }
    setURL(url) { this.data.url = url; return this; }
    setDisabled(disabled = true) { this.data.disabled = disabled; return this; }
    setEmoji(emoji) { this.data.emoji = typeof emoji === 'string' ? { name: emoji } : emoji; return this; }
    toJSON() { return this.data; }
}

class StringSelectMenuBuilder {
    constructor(data = {}) {
        this.data = {
            type: ComponentType.StringSelect,
            custom_id: data.custom_id || data.customId || null,
            placeholder: data.placeholder || null,
            options: data.options || [],
            min_values: data.min_values || 1,
            max_values: data.max_values || 1,
            disabled: Boolean(data.disabled)
        };
    }

    setCustomId(id) { this.data.custom_id = id; return this; }
    setPlaceholder(ph) { this.data.placeholder = ph; return this; }
    addOptions(...options) {
        const flattened = options.flat();
        this.data.options.push(...flattened);
        return this;
    }
    setOptions(options) { this.data.options = options; return this; }
    setMinValues(min) { this.data.min_values = min; return this; }
    setMaxValues(max) { this.data.max_values = max; return this; }
    setDisabled(disabled = true) { this.data.disabled = disabled; return this; }
    toJSON() { return this.data; }
}

class ActionRowBuilder {
    constructor(data = {}) {
        this.data = {
            type: ComponentType.ActionRow,
            components: data.components || []
        };
    }

    addComponents(...components) {
        const flattened = components.flat().map(c => typeof c.toJSON === 'function' ? c.toJSON() : c);
        this.data.components.push(...flattened);
        return this;
    }
    setComponents(...components) {
        this.data.components = components.flat().map(c => typeof c.toJSON === 'function' ? c.toJSON() : c);
        return this;
    }
    toJSON() { return this.data; }
}

class SlashCommandBuilder {
    constructor() {
        this.name = '';
        this.description = '';
        this.options = [];
        this.name_localizations = {};
        this.description_localizations = {};
    }

    setName(name) { this.name = name; return this; }
    setDescription(desc) { this.description = desc; return this; }
    setNameLocalization(locale, name) { this.name_localizations[locale] = name; return this; }
    setDescriptionLocalization(locale, desc) { this.description_localizations[locale] = desc; return this; }
    setIntegrationTypes() { return this; }
    setContexts() { return this; }
    addStringOption(fn) {
        const opt = { type: 3 };
        if (typeof fn === 'function') fn({
            setName: n => { opt.name = n; return this; },
            setDescription: d => { opt.description = d; return this; },
            setRequired: r => { opt.required = r; return this; }
        });
        this.options.push(opt);
        return this;
    }
    addUserOption(fn) {
        const opt = { type: 6 };
        if (typeof fn === 'function') fn({
            setName: n => { opt.name = n; return this; },
            setDescription: d => { opt.description = d; return this; },
            setRequired: r => { opt.required = r; return this; }
        });
        this.options.push(opt);
        return this;
    }
    addIntegerOption(fn) {
        const opt = { type: 4 };
        if (typeof fn === 'function') fn({
            setName: n => { opt.name = n; return this; },
            setDescription: d => { opt.description = d; return this; },
            setRequired: r => { opt.required = r; return this; }
        });
        this.options.push(opt);
        return this;
    }
    toJSON() {
        return {
            name: this.name,
            description: this.description,
            name_localizations: this.name_localizations,
            description_localizations: this.description_localizations,
            options: this.options
        };
    }
}

// TextInput & Modal Builders
const TextInputStyle = {
    Short: 1,
    Paragraph: 2
};

class TextInputBuilder {
    constructor() {
        this.type = 4; // TextInput component type
        this.custom_id = null;
        this.label = null;
        this.style = TextInputStyle.Short;
        this.min_length = null;
        this.max_length = null;
        this.required = true;
        this.value = null;
        this.placeholder = null;
    }
    setCustomId(id) { this.custom_id = id; return this; }
    setLabel(label) { this.label = label; return this; }
    setStyle(style) { this.style = style; return this; }
    setMinLength(min) { this.min_length = min; return this; }
    setMaxLength(max) { this.max_length = max; return this; }
    setRequired(req = true) { this.required = req; return this; }
    setValue(val) { this.value = val; return this; }
    setPlaceholder(ph) { this.placeholder = ph; return this; }
    toJSON() {
        return {
            type: 4,
            custom_id: this.custom_id,
            label: this.label,
            style: this.style,
            min_length: this.min_length,
            max_length: this.max_length,
            required: this.required,
            value: this.value,
            placeholder: this.placeholder
        };
    }
}

class ModalBuilder {
    constructor() {
        this.title = null;
        this.custom_id = null;
        this.components = [];
    }
    setTitle(title) { this.title = title; return this; }
    setCustomId(id) { this.custom_id = id; return this; }
    addComponents(...components) {
        for (const c of components) {
            if (Array.isArray(c)) {
                this.components.push(...c.map(item => typeof item.toJSON === 'function' ? item.toJSON() : item));
            } else if (c instanceof ActionRowBuilder) {
                this.components.push(c.toJSON());
            } else if (typeof c.toJSON === 'function') {
                this.components.push(c.toJSON());
            } else {
                this.components.push(c);
            }
        }
        return this;
    }
    toJSON() {
        return {
            title: this.title,
            custom_id: this.custom_id,
            components: this.components
        };
    }
}

// Interaction Wrapper
class Interaction {
    constructor(client, rawData) {
        this.client = client;
        this.id = rawData.id;
        this.token = rawData.token;
        this.type = rawData.type;
        this.guildId = rawData.guild_id;
        this.channelId = rawData.channel_id;
        this.user = rawData.user || (rawData.member ? rawData.member.user : null);
        this.member = rawData.member;
        this.data = rawData.data || {};
        this.commandName = this.data.name;
        this.customId = this.data.custom_id;
        this.values = this.data.values || [];

        this.replied = false;
        this.deferred = false;

        // Channel & Guild getters
        this.guild = client.guilds.cache.get(this.guildId) || { id: this.guildId };
        this.channel = {
            id: this.channelId,
            send: async (payload) => client.rest.post(Routes.channelMessages(this.channelId), { body: normalizeMessagePayload(payload) })
        };
    }

    isChatInputCommand() { return this.type === 2; }
    isButton() { return this.type === 3 && (!this.data.component_type || this.data.component_type === 2); }
    isStringSelectMenu() { return this.type === 3 && this.data.component_type === 3; }
    isChannelSelectMenu() { return this.type === 3 && this.data.component_type === 8; }
    isModalSubmit() { return this.type === 5; }
    isRepliable() { return !this.replied; }

    async reply(options) {
        const payload = normalizeInteractionResponse(options, 4);
        await this.client.rest.post(Routes.interactionCallback(this.id, this.token), { body: payload });
        this.replied = true;
    }

    async showModal(modal) {
        const payload = {
            type: 9, // Modal response type
            data: typeof modal.toJSON === 'function' ? modal.toJSON() : modal
        };
        await this.client.rest.post(Routes.interactionCallback(this.id, this.token), { body: payload });
        this.replied = true;
    }

    async deferReply(options = {}) {
        const payload = {
            type: 5,
            data: { flags: options.ephemeral || (options.flags && (options.flags & MessageFlags.Ephemeral)) ? MessageFlags.Ephemeral : 0 }
        };
        await this.client.rest.post(Routes.interactionCallback(this.id, this.token), { body: payload });
        this.deferred = true;
    }

    async editReply(options) {
        const payload = normalizeMessagePayload(options);
        const res = await this.client.rest.patch(Routes.webhookMessageOriginal(this.client.application ? this.client.application.id : 'app', this.token), { body: payload });
        this.replied = true;
        return res;
    }

    async followUp(options) {
        const payload = normalizeMessagePayload(options);
        return await this.client.rest.post(`/webhooks/${this.client.application ? this.client.application.id : 'app'}/${this.token}`, { body: payload });
    }

    async update(options) {
        const payload = normalizeInteractionResponse(options, 7);
        await this.client.rest.post(Routes.interactionCallback(this.id, this.token), { body: payload });
        this.replied = true;
    }
}

// Normalizer utilities
function normalizeMessagePayload(options) {
    if (typeof options === 'string') {
        return { content: options };
    }
    const body = { ...options };
    if (body.embeds) {
        body.embeds = body.embeds.map(e => typeof e.toJSON === 'function' ? e.toJSON() : e);
    }
    if (body.components) {
        body.components = body.components.map(c => typeof c.toJSON === 'function' ? c.toJSON() : c);
    }
    if (body.flags && Array.isArray(body.flags)) {
        let flagMask = 0;
        for (const f of body.flags) flagMask |= f;
        body.flags = flagMask;
    }
    return body;
}

function normalizeInteractionResponse(options, type = 4) {
    const data = normalizeMessagePayload(options);
    return { type, data };
}

// Client Core
class Client extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = options;
        this.token = null;
        this.user = null;
        this.application = null;
        this.ws = null;
        this.heartbeatTimer = null;
        
        this.rest = new REST({
            apiBase: options.apiBase || process.env.BASTION_API_URL || 'http://localhost:8080/api/v10'
        });

        this.gatewayUrl = options.gatewayUrl || process.env.BASTION_GATEWAY_URL || 'ws://localhost:8080/gateway';

        this.guilds = {
            cache: new Collection(),
            fetch: async (id) => {
                if (id) {
                    const g = await this.rest.get(Routes.guild(id));
                    this.guilds.cache.set(g.id, g);
                    return g;
                }
                return this.guilds.cache;
            }
        };

        this.channels = {
            cache: new Collection(),
            fetch: async (id) => {
                return {
                    id,
                    send: async (payload) => this.rest.post(Routes.channelMessages(id), { body: normalizeMessagePayload(payload) })
                };
            }
        };

        this.users = {
            cache: new Collection(),
            fetch: async (id) => this.rest.get(`/users/${id}`)
        };

        this.commands = new Collection();
        this.cooldowns = new Collection();
        this.maintenanceMode = false;
        this.startTime = Date.now();
    }

    async login(token) {
        if (!token) {
            token = process.env.BASTION_TOKEN;
        }
        if (!token) {
            throw new Error('Token de connexion manquant (BASTION_TOKEN).');
        }

        this.token = token.trim().replace(/^["'](.+)["']$/, '$1');
        this.rest.setToken(this.token);

        if (!WebSocketClient) {
            throw new Error('WebSocket client introuvable. Installez `ws` ou utilisez Node.js 18+.');
        }

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocketClient(this.gatewayUrl);

                const onOpen = () => {
                    // Attente du HELLO
                };

                const onMessage = (eventOrData) => {
                    try {
                        const raw = typeof eventOrData === 'string' || Buffer.isBuffer(eventOrData) 
                            ? eventOrData.toString() 
                            : (eventOrData.data ? eventOrData.data.toString() : eventOrData.toString());
                        const payload = JSON.parse(raw);
                        this.handleGatewayPayload(payload, resolve);
                    } catch (err) {
                        this.emit(Events.Error, err);
                    }
                };

                const onError = (err) => {
                    this.emit(Events.Error, err);
                };

                const onClose = (codeOrEvent, reason) => {
                    clearInterval(this.heartbeatTimer);
                    const code = typeof codeOrEvent === 'number' ? codeOrEvent : (codeOrEvent?.code || 1000);
                    const r = reason ? reason.toString() : (codeOrEvent?.reason || '');
                    this.emit('disconnect', { code, reason: r });
                };

                if (typeof this.ws.on === 'function') {
                    this.ws.on('open', onOpen);
                    this.ws.on('message', onMessage);
                    this.ws.on('error', onError);
                    this.ws.on('close', onClose);
                } else if (typeof this.ws.addEventListener === 'function') {
                    this.ws.addEventListener('open', onOpen);
                    this.ws.addEventListener('message', onMessage);
                    this.ws.addEventListener('error', onError);
                    this.ws.addEventListener('close', onClose);
                } else {
                    this.ws.onopen = onOpen;
                    this.ws.onmessage = onMessage;
                    this.ws.onerror = onError;
                    this.ws.onclose = onClose;
                }
            } catch (err) {
                reject(err);
            }
        });
    }

    handleGatewayPayload(payload, loginResolve) {
        const { op, d, t } = payload;

        if (op === 10) { // HELLO
            const interval = d.heartbeat_interval || 41250;
            this.heartbeatTimer = setInterval(() => {
                if (this.ws && this.ws.readyState === (WebSocketClient.OPEN || 1)) {
                    this.ws.send(JSON.stringify({ op: 1 }));
                }
            }, interval);

            // Send IDENTIFY (Opcode 2)
            this.ws.send(JSON.stringify({
                op: 2,
                d: {
                    token: this.token,
                    intents: this.options.intents || 0,
                    properties: {
                        os: process.platform,
                        browser: 'bastion.js',
                        device: 'bastion.js'
                    }
                }
            }));
        } else if (op === 11) { // HEARTBEAT_ACK
            // Heartbeat reçu avec succès
        } else if (op === 0) { // DISPATCH
            this.handleDispatch(t, d, loginResolve);
        }
    }

    handleDispatch(eventName, data, loginResolve) {
        switch (eventName) {
            case 'READY':
                this.user = data.user;
                this.application = data.application;
                if (Array.isArray(data.guilds)) {
                    for (const g of data.guilds) {
                        this.guilds.cache.set(g.id, g);
                    }
                }
                if (loginResolve) loginResolve(this.token);
                this.emit(Events.ClientReady, this);
                break;

            case 'GUILD_CREATE':
                this.guilds.cache.set(data.id, data);
                this.emit(Events.GuildCreate, data);
                break;

            case 'GUILD_DELETE':
                this.guilds.cache.delete(data.id);
                this.emit(Events.GuildDelete, data);
                break;

            case 'GUILD_MEMBER_ADD':
                this.emit(Events.GuildMemberAdd, data);
                break;

            case 'MESSAGE_CREATE':
                const msg = {
                    ...data,
                    author: data.author,
                    guild: this.guilds.cache.get(data.guild_id),
                    channel: {
                        id: data.channel_id,
                        send: async (payload) => this.rest.post(Routes.channelMessages(data.channel_id), { body: normalizeMessagePayload(payload) })
                    },
                    delete: async () => this.rest.delete(Routes.channelMessage(data.channel_id, data.id)),
                    reply: async (payload) => this.rest.post(Routes.channelMessages(data.channel_id), { body: normalizeMessagePayload(payload) })
                };
                this.emit(Events.MessageCreate, msg);
                break;

            case 'MESSAGE_DELETE':
                this.emit(Events.MessageDelete, data);
                break;

            case 'INTERACTION_CREATE':
                const interaction = new Interaction(this, data);
                this.emit(Events.InteractionCreate, interaction);
                break;

            default:
                this.emit(eventName, data);
                break;
        }
    }

    destroy() {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        if (this.ws) {
            try { this.ws.close(); } catch (e) {}
        }
    }
}

// Exports officiels BASTION SDK
module.exports = {
    Client,
    Collection,
    GatewayIntentBits,
    Partials,
    Events,
    REST,
    Routes,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ComponentType,
    ApplicationCommandType,
    MessageFlags
};
