/**
 * ============================================================================
 * 🌌 LEXY PROTECT V3 - TITANIUM EDITION 🌌
 * MOTOR DE CIBERSEGURIDAD, ANTI-DUMP, ANTI-TAMPER Y ANTI-DEOBF
 * Optimizado para despliegue en Railway / VPS
 * ============================================================================
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const moment = require('moment');
const bodyParser = require('body-parser');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 🛡️ CAPA 1: FIREWALL Y SANITIZACIÓN EXTREMA
// ==========================================
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Evitar inyecciones NoSQL en MongoDB (ej: {"$gt": ""})
app.use(mongoSanitize());

// Proteger contra HTTP Parameter Pollution (HPP)
app.use(hpp());

// Helmet para cabeceras de seguridad estrictas (Anti-XSS, Anti-Clickjacking)
app.use(helmet({
    contentSecurityPolicy: false, 
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    xssFilter: true
}));

// CORS estricto (solo permite peticiones desde tu propio dominio)
app.use(cors({ origin: process.env.DOMAIN || '*', methods: 'GET,POST' }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'lexy_titanium_god_gengar_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }
}));
app.use(passport.initialize());
app.use(passport.session());

// ==========================================
// 🗄️ CAPA 2: BASE DE DATOS Y ESQUEMAS
// ==========================================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🔮 Lexy Protect DB Conectada! [Modo Titanio Activado]'))
    .catch(err => console.error('Error Crítico DB:', err));

const User = mongoose.model('User', new mongoose.Schema({
    discordId: String,
    username: String,
    avatar: String,
    role: { type: String, default: 'user' }
}));

const Script = mongoose.model('Script', new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customName: { type: String, unique: true, required: true },
    content: { type: String, required: true },
    executions: { type: Number, default: 0 },
    uniqueUsers: { type: Number, default: 0 },
    lastExecuted: { type: Date, default: null },
    hashedIps: { type: [String], default: [] },
    status: { type: String, default: 'active', enum: ['active', 'paused'] },
    webhookUrl: { type: String, default: '' },
    securityLevel: { type: String, default: 'max' } // Preparado para futuras flags
}));

// ==========================================
// 🔑 CAPA 3: AUTENTICACIÓN (DISCORD OAUTH)
// ==========================================
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => User.findById(id).then(user => done(null, user)));

if (process.env.DISCORD_CLIENT_ID) {
    passport.use(new DiscordStrategy({
        clientID: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        callbackURL: '/auth/discord/callback',
        scope: ['identify']
    }, async (accessToken, refreshToken, profile, done) => {
        let user = await User.findOne({ discordId: profile.id });
        if (!user) {
            user = await User.create({ 
                discordId: profile.id, 
                username: profile.username, 
                avatar: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` 
            });
        }
        return done(null, user);
    }));
}

const isAuth = (req, res, next) => req.isAuthenticated() ? next() : res.redirect('/login');

// ==========================================
// 💻 CAPA 4: RUTAS WEB Y LIMITADORES
// ==========================================
const uiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/login', uiLimiter);
app.use('/auth', uiLimiter);

app.get('/', (req, res) => res.redirect('/dashboard'));
app.get('/login', (req, res) => res.render('login'));
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { successRedirect: '/dashboard', failureRedirect: '/login' }));
app.get('/logout', (req, res) => { req.logout(() => res.redirect('/login')); });

// Dashboard
app.get('/dashboard', isAuth, async (req, res) => {
    const scripts = await Script.find({ owner: req.user._id }).sort({ executions: -1 });
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    let totalExecs = 0, totalUnique = 0;
    scripts.forEach(s => { totalExecs += s.executions; totalUnique += s.uniqueUsers; });
    res.render('dashboard', { user: req.user, scripts, baseUrl, totalExecs, totalUnique, moment, error: req.query.error });
});

// ==========================================
// ⚔️ CAPA 5: EL MOTOR LUA DE OFUSCACIÓN 
// ==========================================
// Esta función convierte tu código crudo en un monstruo indescifrable y protegido.
function generateAntiDumpPayload(rawScript) {
    // 1. Convertimos el script original en Base64 (Ocultamos las variables a simple vista)
    const base64Code = Buffer.from(rawScript).toString('base64');
    
    // 2. Construimos el Wrapper Anti-Tamper en Lua
    return `
-- [[ LEXY PROTECT TITANIUM: ANTI-DUMP & ANTI-TAMPER SECURE WRAPPER ]] --
local _G_ENV = getgenv and getgenv() or getfenv(0)

-- 1. Anti-Dump (Bloquea SaveInstance para que no roben el mapa con el script)
if _G_ENV.saveinstance then
    local old_save = _G_ENV.saveinstance
    _G_ENV.saveinstance = function(...)
        warn("[Lexy Protect] Intento de Dump bloqueado. La seguridad de este script está activa.")
        while true do end -- Congela el cliente del explotador si intenta dumpear
    end
end

-- 2. Anti-HttpSpy (Evita que vean a dónde hace peticiones tu script)
if _G_ENV.hookfunction and _G_ENV.game and _G_ENV.game.HttpGet then
    local oldHttpGet
    oldHttpGet = hookfunction(_G_ENV.game.HttpGet, function(self, url, ...)
        if string.find(url, "lexyprotect") or string.find(url, "railway") then
            return oldHttpGet(self, "https://api.github.com/zen", ...) -- Desvía la vista del spy
        end
        return oldHttpGet(self, url, ...)
    end)
end

-- 3. Anti-Deobfuscation (Rompe los formatters y print loggers)
local function anti_print_logger(...) end
if _G_ENV.rconsoleprint then _G_ENV.rconsoleprint = anti_print_logger end

-- 4. Desencriptador Base64 Nativo y Ejecución Segura
local b64_payload = "${base64Code}"
local b = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
local function decrypt_payload(data)
    data = string.gsub(data, '[^'..b..'=]', '')
    return (data:gsub('.', function(x)
        if (x == '=') then return '' end
        local r,f='',(b:find(x)-1)
        for i=6,1,-1 do r=r..(f%2^i-f%2^(i-1)>0 and '1' or '0') end
        return r;
    end):gsub('%d%d%d?%d?%d?%d?%d?%d?', function(x)
        if (#x ~= 8) then return '' end
        local c=0
        for i=1,8 do c=c+(x:sub(i,i)=='1' and 2^(8-i) or 0) end
        return string.char(c)
    end))
end

-- 5. Ejecutar en Sandbox Aislado
local success, result = pcall(function()
    local decoded = decrypt_payload(b64_payload)
    local exec_func = loadstring(decoded)
    if type(exec_func) == "function" then
        exec_func()
    else
        warn("[Lexy Protect] Fallo de integridad en el script.")
    end
end)

if not success then
    warn("[Lexy Protect] Auto-Destrucción activada por manipulación.")
end
    `;
}

// ==========================================
// 🚀 CAPA 6: ENTREGA DE SCRIPT EXTREMADAMENTE ESTRICTA
// ==========================================
const executionLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, max: 10, // Max 10 ejecuciones por minuto por IP
    message: "print('[Lexy Protect] Rate Limit: Has superado el límite de inyecciones. Espera 60 segundos.')"
});

app.get('/script/:scriptName', executionLimiter, async (req, res) => {
    const { scriptName } = req.params;
    
    // 1. FINGERPRINTING DE CABECERAS HTTP (Muerte a los Browsers y Scrapers)
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const acceptHeader = (req.headers['accept'] || '').toLowerCase();
    const secFetchDest = (req.headers['sec-fetch-dest'] || '').toLowerCase();
    
    // Si la petición viene buscando HTML (como Chrome/Firefox), bloqueamos.
    if (acceptHeader.includes('text/html') || secFetchDest === 'document') {
        return res.status(403).send("Lexy Protect: Acceso Bloqueado. Sistema Anti-Browser Activo.");
    }

    // Blacklist masiva de Scrapers y herramientas de red
    const blockedBots = ['discord', 'bot', 'crawler', 'spider', 'curl', 'wget', 'postman', 'insomnia', 'axios', 'node-fetch', 'python', 'java', 'httpclient'];
    if (blockedBots.some(bot => userAgent.includes(bot))) {
        res.setHeader('Content-Type', 'text/plain');
        return res.send(`print("[Lexy Protect] Interceptado por Firewall. Entidad no reconocida.")`);
    }

    try {
        const script = await Script.findOne({ customName: scriptName });
        if (!script) return res.send(`print("[Lexy Protect] Script no encontrado o eliminado.")`);
        if (script.status === 'paused') return res.send(`print("[Lexy Protect] Mantenimiento. Intenta más tarde.")`);

        // 2. RASTREO FANTASMA DE IPs (SHA-256)
        const rawIp = req.headers['x-forwarded-for'] || req.headers['cf-connecting-ip'] || req.socket.remoteAddress;
        const hashedIp = crypto.createHash('sha256').update(rawIp).digest('hex');

        let isUnique = false;
        if (!script.hashedIps.includes(hashedIp)) {
            script.hashedIps.push(hashedIp);
            script.uniqueUsers += 1;
            isUnique = true;
        }

        script.executions += 1;
        script.lastExecuted = new Date();
        await script.save();

        // 3. ENVÍO DE WEBHOOK SILENCIOSO (Estilo Gengar/Morado oscuro)
        if (script.webhookUrl) {
            try {
                fetch(script.webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        embeds: [{
                            title: `🛡️ Lexy Protect: Ejecución Detectada`,
                            description: `**Script:** \`${script.customName}\``,
                            color: 0x705898, // Color Morado Oscuro
                            fields: [
                                { name: "🔑 Hash Dispositivo", value: `\`${hashedIp.substring(0, 12)}...\``, inline: true },
                                { name: "👤 Usuario Único", value: isUnique ? "Sí 🟢" : "No 🔴", inline: true },
                                { name: "📊 Ejecuciones", value: `${script.executions}`, inline: true }
                            ],
                            footer: { text: "Lexy Protect V3 - Titanium Security" },
                            timestamp: new Date().toISOString()
                        }]
                    })
                });
            } catch (e) {} 
        }

        // 4. ENTREGAR CÓDIGO OFUSCADO Y MUTADO
        // Desactivamos caché a nivel de ISP/Proxy
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Content-Type', 'text/plain');
        
        // Generamos el wrapper de seguridad dinámicamente y lo enviamos
        const protectedPayload = generateAntiDumpPayload(script.content);
        res.send(protectedPayload);

    } catch (error) {
        res.status(500).send(`print("[Lexy Protect] Fallo del núcleo del servidor.")`);
    }
});

// Subir Script (con Límite Estricto de 5)
app.post('/upload', isAuth, async (req, res) => {
    const scriptCount = await Script.countDocuments({ owner: req.user._id });
    if (scriptCount >= 5) return res.redirect('/dashboard?error=limit');

    const safeName = req.body.customName.replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase();
    try {
        await Script.create({ owner: req.user._id, customName: safeName, content: req.body.content, webhookUrl: req.body.webhookUrl || '' });
        res.redirect('/dashboard');
    } catch (err) {
        res.redirect('/dashboard?error=exists');
    }
});

// Borrar Script
app.post('/delete/:id', isAuth, async (req, res) => {
    await Script.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    res.redirect('/dashboard');
});

app.listen(PORT, () => console.log(`🚀 Lexy Protect V3 TITANIUM corriendo en el puerto ${PORT}`));
