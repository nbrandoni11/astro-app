// Limpia caracteres que pueden generar problemas dentro de ContentVariables.
export function sanitizeContentVariable(value: string) {
    return value
        .replace(/[\r\n\t]+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
}

// Recorta intentando conservar una oración completa.
// Solo se utiliza como protección de emergencia si OpenAI supera el límite.
export function smartTrim(value: string, maxLength: number) {
    const clean = sanitizeContentVariable(value);

    if (clean.length <= maxLength) {
        return clean;
    }

    const candidate = clean.slice(0, maxLength);

    // Intentar terminar en el último final de oración razonable.
    const sentenceEnd = Math.max(
        candidate.lastIndexOf(". "),
        candidate.lastIndexOf("! "),
        candidate.lastIndexOf("? ")
    );

    // Solo usamos el corte por oración si no elimina demasiado contenido.
    if (sentenceEnd >= Math.floor(maxLength * 0.7)) {
        return candidate.slice(0, sentenceEnd + 1).trim();
    }

    // Si no encontramos una oración suficientemente cerca,
    // cortar en la última palabra completa.
    const lastSpace = candidate.lastIndexOf(" ");

    if (lastSpace > 0) {
        return candidate.slice(0, lastSpace).trim() + "…";
    }

    return candidate.trim();
}

// Ajusta proporcionalmente tres secciones si la suma supera
// el presupuesto disponible para las variables del template.
export function fitThreeSections(
    first: string,
    second: string,
    third: string,
    maxTotal: number
): [string, string, string] {
    let a = sanitizeContentVariable(first);
    let b = sanitizeContentVariable(second);
    let c = sanitizeContentVariable(third);

    const total = a.length + b.length + c.length;

    if (total <= maxTotal) {
        return [a, b, c];
    }

    // Distribuir el espacio proporcionalmente según
    // la longitud original de cada sección.
    const ratio = maxTotal / total;

    let maxA = Math.floor(a.length * ratio);
    let maxB = Math.floor(b.length * ratio);
    let maxC = Math.floor(c.length * ratio);

    // Garantizar que ninguna sección desaparezca por completo.
    maxA = Math.max(maxA, 180);
    maxB = Math.max(maxB, 180);
    maxC = Math.max(maxC, 180);

    // Si los mínimos hicieron que volvamos a superar el presupuesto,
    // repartimos el espacio de manera uniforme.
    if (maxA + maxB + maxC > maxTotal) {
        const equalBudget = Math.floor(maxTotal / 3);

        maxA = equalBudget;
        maxB = equalBudget;
        maxC = maxTotal - equalBudget * 2;
    }

    a = smartTrim(a, maxA);
    b = smartTrim(b, maxB);
    c = smartTrim(c, maxC);

    // Segunda comprobación por seguridad.
    let fittedTotal = a.length + b.length + c.length;

    if (fittedTotal > maxTotal) {
        const excess = fittedTotal - maxTotal;

        // Reducimos primero la sección más larga.
        const sections = [
            { key: "a", value: a },
            { key: "b", value: b },
            { key: "c", value: c },
        ].sort((x, y) => y.value.length - x.value.length);

        const longest = sections[0];

        if (longest.key === "a") {
            a = smartTrim(a, Math.max(150, a.length - excess - 5));
        } else if (longest.key === "b") {
            b = smartTrim(b, Math.max(150, b.length - excess - 5));
        } else {
            c = smartTrim(c, Math.max(150, c.length - excess - 5));
        }

        fittedTotal = a.length + b.length + c.length;
    }

    return [a, b, c];
}

export function horoscopeDateLabel(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Fecha de lectura inválida");
    const date = new Date(`${value}T12:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        throw new Error("Fecha de lectura inválida");
    }
    return `Fecha de la lectura: ${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}. `;
}

export function datedSections(sections: [string, string, string], date: string, max: number): [string, string, string] {
    const prefix = horoscopeDateLabel(date);
    const [first, second, third] = fitThreeSections(...sections, max - prefix.length);
    return [prefix + first, second, third];
}
