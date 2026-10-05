import { NextResponse } from "next/server";
import puppeteer, { Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import path from "path";
import fs from "fs";
import JSZip from "jszip";

export const runtime = "nodejs";

const VALID_TYPES = [
    "portada",
    "sinopsis",
    "general",
    "amor",
    "trabajo",
    "bienestar",
    "consejo",
] as const;

type PlateType = (typeof VALID_TYPES)[number];

type PlateConfig = {
    title: string;
    text: string;
    background: string;
    color: string;
    width: number;
    fontSize: number;
    lineHeight: number;
    paragraphMode: boolean;
};

export async function GET(req: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let browser: Browser | undefined;

    try {
        const url = new URL(req.url);

        const type =
            url.searchParams.get("type") ||
            "sinopsis";

        const validRequestTypes = [
            ...VALID_TYPES,
            "all",
        ];

        if (
            !validRequestTypes.includes(
                type as any
            )
        ) {
            throw new Error(
                "Tipo de placa no válido"
            );
        }

        // --------------------------------------
        // 1. OBTENER HORÓSCOPO UNA SOLA VEZ
        // --------------------------------------

        const horoscopeResponse =
            await fetch(
                `${url.origin}/api/general-transits`,
                {
                    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
                    cache: "no-store",
                }
            );

        if (!horoscopeResponse.ok) {
            throw new Error(
                "No se pudo obtener el horóscopo del día"
            );
        }

        const horoscopeData =
            await horoscopeResponse.json();

        const horoscope =
            typeof horoscopeData.horoscope ===
                "string"
                ? JSON.parse(
                    horoscopeData.horoscope
                )
                : horoscopeData.horoscope;

        // --------------------------------------
        // 2. DETERMINAR PORTADA SEGÚN EL DÍA
        // --------------------------------------

        const portadaBackground =
            getPortadaBackground(
                horoscopeData.date
            );

        // --------------------------------------
        // 3. CONFIGURACIÓN DE LAS PLACAS
        // --------------------------------------

        const configs: Record<
            PlateType,
            PlateConfig
        > = {
            portada: {
                title: "",
                text: "",
                background: portadaBackground,
                color: "#F2EFE8",
                width: 900,
                fontSize: 90,
                lineHeight: 1,
                paragraphMode: false,
            },

            sinopsis: {
                title: "SINOPSIS DEL DÍA",
                text: horoscope.sinopsis,
                background: "sinopsis.png",
                color: "#222222",
                width: 610,
                fontSize: 58,
                lineHeight: 1.08,
                paragraphMode: false,
            },

            general: {
                title: "RESUMEN GENERAL",
                text: horoscope.general,
                background: "general.png",
                color: "#F2EFE8",
                width: 650,
                fontSize: 39,
                lineHeight: 1.15,
                paragraphMode: true,
            },

            amor: {
                title: "AMOR Y VÍNCULOS",
                text: horoscope.amor,
                background: "amor.png",
                color: "#222222",
                width: 610,
                fontSize: 43,
                lineHeight: 1.15,
                paragraphMode: true,
            },

            trabajo: {
                title: "TRABAJO Y DINERO",
                text:
                    horoscope.trabajo_dinero,
                background: "trabajo.png",
                color: "#222222",
                width: 610,
                fontSize: 43,
                lineHeight: 1.15,
                paragraphMode: true,
            },

            bienestar: {
                title: "BIENESTAR",
                text: horoscope.bienestar,
                background: "bienestar.png",
                color: "#222222",
                width: 610,
                fontSize: 43,
                lineHeight: 1.15,
                paragraphMode: true,
            },

            consejo: {
                title: "CONSEJO DEL DÍA",
                text: horoscope.consejo,
                background: "consejo.png",
                color: "#F2EFE8",
                width: 610,
                fontSize: 58,
                lineHeight: 1.08,
                paragraphMode: false,
            },
        };

        // --------------------------------------
        // 4. CARGAR TIPOGRAFÍA
        // --------------------------------------

        const fontPath = path.join(
            process.cwd(),
            "public",
            "fonts",
            "EBGaramond-Regular.ttf"
        );

        const fontBase64 = fs
            .readFileSync(fontPath)
            .toString("base64");

        // --------------------------------------
        // 5. ABRIR CHROMIUM
        // --------------------------------------

        const isVercel =
            process.env.VERCEL === "1";

        let executablePath: string;

        if (isVercel) {
            const chromiumPackUrl =
                "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar";

            executablePath =
                await chromium.executablePath(
                    chromiumPackUrl
                );
        } else {
            executablePath =
                getLocalChromePath();
        }

        browser = await puppeteer.launch({
            args: isVercel
                ? chromium.args
                : [],
            defaultViewport: {
                width: 1080,
                height: 1350,
            },
            executablePath,
            headless: true,
        });

        // --------------------------------------
        // MODO INDIVIDUAL
        // --------------------------------------

        if (type !== "all") {
            const plateType =
                type as PlateType;

            const config =
                configs[plateType];

            const screenshot =
                plateType === "portada"
                    ? await generateCover(
                        browser,
                        config.background,
                        horoscopeData.date,
                        fontBase64
                    )
                    : await generatePlate(
                        browser,
                        config,
                        horoscopeData.date,
                        fontBase64
                    );

            await browser.close();
            browser = undefined;

            return new NextResponse(
                new Uint8Array(screenshot),
                {
                    headers: {
                        "Content-Type":
                            "image/png",

                        "Cache-Control":
                            "no-store",
                    },
                }
            );
        }

        // --------------------------------------
        // MODO ALL
        // --------------------------------------

        const zip = new JSZip();

        // PORTADA

        const coverScreenshot =
            await generateCover(
                browser,
                portadaBackground,
                horoscopeData.date,
                fontBase64
            );

        zip.file(
            "00-portada.png",
            coverScreenshot
        );

        // RESTO DE PLACAS

        const contentTypes = [
            "sinopsis",
            "general",
            "amor",
            "trabajo",
            "bienestar",
            "consejo",
        ] as const;

        const filenames: Record<
            (typeof contentTypes)[number],
            string
        > = {
            sinopsis: "01-sinopsis.png",
            general: "02-general.png",
            amor: "03-amor.png",
            trabajo:
                "04-trabajo-dinero.png",
            bienestar:
                "05-bienestar.png",
            consejo: "06-consejo.png",
        };

        for (
            const plateType of contentTypes
        ) {
            const config =
                configs[plateType];

            if (!config.text) {
                throw new Error(
                    `No se encontró el texto para ${plateType}`
                );
            }

            const screenshot =
                await generatePlate(
                    browser,
                    config,
                    horoscopeData.date,
                    fontBase64
                );

            zip.file(
                filenames[plateType],
                screenshot
            );
        }

        // --------------------------------------
        // 6. AGREGAR CAPTION
        // --------------------------------------

        if (horoscope.caption) {
            zip.file(
                "caption.txt",
                horoscope.caption
            );
        }

        // --------------------------------------
        // 7. CREAR ZIP
        // --------------------------------------

        const zipBuffer =
            await zip.generateAsync({
                type: "nodebuffer",
                compression: "DEFLATE",
                compressionOptions: {
                    level: 6,
                },
            });

        await browser.close();
        browser = undefined;

        const formattedDate =
            formatDateForFilename(
                horoscopeData.date
            );

        return new NextResponse(
            new Uint8Array(zipBuffer),
            {
                headers: {
                    "Content-Type":
                        "application/zip",

                    "Content-Disposition":
                        `attachment; filename="horoscopo-${formattedDate}.zip"`,

                    "Cache-Control":
                        "no-store",
                },
            }
        );
    } catch (error: any) {
        if (browser) {
            await browser.close();
        }

        console.error(
            "ERROR GENERANDO IMAGEN:",
            error
        );

        return NextResponse.json(
            {
                ok: false,

                error:
                    error?.message ||
                    "Error generando imágenes",
            },
            {
                status: 500,
            }
        );
    }
}

// ==================================================
// ELEGIR PORTADA SEGÚN DÍA
// ==================================================

function getPortadaBackground(
    date: string
) {
    const [year, month, day] =
        date.split("-").map(Number);

    const dayOfWeek =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        ).getUTCDay();

    const backgrounds = [
        "portada-domingo.png",
        "portada-lunes.png",
        "portada-martes.png",
        "portada-miercoles.png",
        "portada-jueves.png",
        "portada-viernes.png",
        "portada-sabado.png",
    ];

    return backgrounds[dayOfWeek];
}

// ==================================================
// OBTENER CHROME LOCAL
// ==================================================

function getLocalChromePath() {
    if (process.platform === "win32") {
        const candidates = [
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
            path.join(
                process.env.LOCALAPPDATA || "",
                "Google",
                "Chrome",
                "Application",
                "chrome.exe"
            ),
        ];

        for (const candidate of candidates) {
            if (
                candidate &&
                fs.existsSync(candidate)
            ) {
                return candidate;
            }
        }

        throw new Error(
            "No se encontró Google Chrome instalado localmente."
        );
    }

    if (process.platform === "darwin") {
        return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    }

    const linuxCandidates = [
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
    ];

    for (const candidate of linuxCandidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    throw new Error(
        "No se encontró Chrome local."
    );
}

// ==================================================
// GENERAR PORTADA
// ==================================================

async function generateCover(
    browser: Browser,
    background: string,
    date: string,
    fontBase64: string
) {
    const backgroundPath = path.join(
        process.cwd(),
        "public",
        "daily-horoscope",
        background
    );

    const backgroundBase64 = fs
        .readFileSync(backgroundPath)
        .toString("base64");

    const page = await browser.newPage();

    try {
        await page.setViewport({
            width: 1080,
            height: 1350,
            deviceScaleFactor: 1,
        });

        await page.setContent(`
            <!DOCTYPE html>
            <html>
            <head>
                <style>

                    @font-face {
                        font-family: "EB Garamond";
                        src: url(
                            data:font/ttf;base64,${fontBase64}
                        );
                    }

                    * {
                        box-sizing: border-box;
                    }

                    html,
                    body {
                        margin: 0;
                        width: 1080px;
                        height: 1350px;
                        overflow: hidden;
                    }

                    body {
                        background-image:
                            url(
                                data:image/png;base64,${backgroundBase64}
                            );

                        background-size: cover;
                        background-position: center;
                        background-repeat: no-repeat;
                    }

                    .cover {
                        position: absolute;

                        left: 90px;
                        right: 90px;
                        bottom: 110px;

                        color: #F2EFE8;
                        text-align: left;
                    }

                    .cover-title {
                        font-family:
                            Arial,
                            sans-serif;

                        font-size: 28px;
                        font-weight: 400;

                        letter-spacing: 6px;

                        text-transform:
                            uppercase;

                        margin-bottom: 24px;
                    }

                    .cover-date {
                        font-family:
                            "EB Garamond",
                            serif;

                        font-size: 105px;
                        line-height: 0.95;

                        font-weight: 400;

                        letter-spacing: -2px;
                    }

                </style>
            </head>

            <body>

                <div class="cover">

                    <div class="cover-title">
                        EL CIELO HOY
                    </div>

                    <div class="cover-date">
                        ${formatDate(date)}
                    </div>

                </div>

            </body>
            </html>
        `);

        await page.evaluate(
            () => document.fonts.ready
        );

        const screenshot =
            await page.screenshot({
                type: "png",
                fullPage: false,
            });

        return Buffer.from(screenshot);
    } finally {
        await page.close();
    }
}

// ==================================================
// GENERAR UNA PLACA
// ==================================================

async function generatePlate(
    browser: Browser,
    config: PlateConfig,
    date: string,
    fontBase64: string
) {
    const backgroundPath = path.join(
        process.cwd(),
        "public",
        "daily-horoscope",
        config.background
    );

    const backgroundBase64 = fs
        .readFileSync(backgroundPath)
        .toString("base64");

    const page = await browser.newPage();

    try {
        await page.setViewport({
            width: 1080,
            height: 1350,
            deviceScaleFactor: 1,
        });

        await page.setContent(`
            <!DOCTYPE html>

            <html>

            <head>

                <style>

                    @font-face {
                        font-family: "EB Garamond";

                        src: url(
                            data:font/ttf;base64,${fontBase64}
                        );
                    }

                    * {
                        box-sizing: border-box;
                    }

                    html,
                    body {
                        margin: 0;

                        width: 1080px;
                        height: 1350px;

                        overflow: hidden;
                    }

                    body {
                        background-image:
                            url(
                                data:image/png;base64,${backgroundBase64}
                            );

                        background-size: cover;
                        background-position: center;
                        background-repeat: no-repeat;

                        color: ${config.color};
                    }

                    .content {
                        position: absolute;

                        left: 90px;
                        top: 50%;

                        width: ${config.width}px;

                        transform:
                            translateY(-50%);

                        text-align: left;
                    }

                    .section {
                        font-family:
                            Arial,
                            sans-serif;

                        font-size: 23px;

                        letter-spacing: 5px;

                        text-transform:
                            uppercase;

                        margin-bottom: 55px;

                        text-align: left;
                    }

                    .horoscope {
                        font-family:
                            "EB Garamond",
                            serif;

                        font-size:
                            ${config.fontSize}px;

                        line-height:
                            ${config.lineHeight};

                        font-weight: 400;

                        text-align: left;
                    }

                    .horoscope p {
                        margin:
                            0 0 22px 0;
                    }

                    .horoscope p:last-child {
                        margin-bottom: 0;
                    }

                    .date {
                        margin-top: 50px;

                        font-family:
                            Arial,
                            sans-serif;

                        font-size: 18px;

                        letter-spacing: 3px;

                        opacity: 0.65;

                        text-align: left;
                    }

                </style>

            </head>

            <body>

                <div class="content">

                    <div class="section">
                        ${config.title}
                    </div>

                    <div class="horoscope">
                        ${formatHoroscopeText(
            config.text,
            config.paragraphMode
        )}
                    </div>

                    <div class="date">
                        ${formatDate(date)}
                    </div>

                </div>

            </body>

            </html>
        `);

        await page.evaluate(
            () => document.fonts.ready
        );

        const screenshot =
            await page.screenshot({
                type: "png",
                fullPage: false,
            });

        return Buffer.from(screenshot);
    } finally {
        await page.close();
    }
}

// ==================================================
// ESCAPAR CARACTERES HTML
// ==================================================

function escapeHtml(text: string) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==================================================
// FORMATEAR TEXTO
// ==================================================

function formatHoroscopeText(
    text: string,
    paragraphMode: boolean
) {
    if (!paragraphMode) {
        return escapeHtml(text);
    }

    const sentences =
        text.match(
            /[^.!?]+[.!?]+(?:["”']|$)?/g
        ) || [text];

    return sentences
        .map((sentence) => {
            const clean =
                sentence.trim();

            return `<p>${escapeHtml(
                clean
            )}</p>`;
        })
        .join("");
}

// ==================================================
// FORMATEAR FECHA
// ==================================================

function formatDate(date: string) {
    const [year, month, day] =
        date.split("-");

    return `${day}.${month}.${year}`;
}

// ==================================================
// FORMATEAR FECHA PARA ZIP
// ==================================================

function formatDateForFilename(
    date: string
) {
    const [year, month, day] =
        date.split("-");

    return `${year}-${month}-${day}`;
}