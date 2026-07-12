export function randomBell() {
    const u = Math.max(Number.EPSILON, Math.random());
    const v = Math.max(Number.EPSILON, Math.random());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
}

export function paintEllipticalGlow(target, x, y, radiusX, radiusY, rotation, stops) {
    target.save();
    target.translate(x, y);
    target.rotate(rotation);
    target.scale(radiusX, radiusY);
    const gradient = target.createRadialGradient(0, 0, 0, 0, 0, 1);
    stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
    target.fillStyle = gradient;
    target.fillRect(-1, -1, 2, 2);
    target.restore();
}

export function drawStarPoint(target, star, alpha = star.alpha) {
    target.fillStyle = `hsla(${star.hue},80%,88%,${alpha})`;
    target.beginPath();
    target.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    target.fill();
}

export function drawBrightStar(target, star, alpha) {
    const glowRadius = star.radius * 8;
    const glow = target.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowRadius);
    glow.addColorStop(0, `hsla(${star.hue},90%,96%,${alpha})`);
    glow.addColorStop(0.18, `hsla(${star.hue},90%,82%,${alpha * 0.42})`);
    glow.addColorStop(1, `hsla(${star.hue},90%,68%,0)`);
    target.fillStyle = glow;
    target.beginPath();
    target.arc(star.x, star.y, glowRadius, 0, Math.PI * 2);
    target.fill();

    target.strokeStyle = `hsla(${star.hue},90%,92%,${alpha * 0.32})`;
    target.lineWidth = 0.7;
    target.beginPath();
    target.moveTo(star.x - star.radius * 6, star.y);
    target.lineTo(star.x + star.radius * 6, star.y);
    target.moveTo(star.x, star.y - star.radius * 4);
    target.lineTo(star.x, star.y + star.radius * 4);
    target.stroke();
}
