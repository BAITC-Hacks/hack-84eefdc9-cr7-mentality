import type { CoseLayoutOptions } from "cytoscape";

export const organicLayout: CoseLayoutOptions = {
  name: "cose",
  animate: false,
  fit: false,
  randomize: false,
  nodeDimensionsIncludeLabels: false,
  componentSpacing: 100,
  nodeRepulsion: () => 6500,
  nodeOverlap: 12,
  idealEdgeLength: () => 100,
  edgeElasticity: () => 90,
  gravity: 0.45,
  numIter: 700,
  initialTemp: 160,
  coolingFactor: 0.985,
  minTemp: 0.8,
};

export function initialGraphPositions(nodes: readonly { gid: string }[]) {
  // Noncoincident, ordered seeds avoid COSE's random collision fallback.
  const angle = Math.PI * (3 - Math.sqrt(5));
  return new Map(
    [...nodes].sort((a, b) => a.gid < b.gid ? -1 : a.gid > b.gid ? 1 : 0)
      .map(({ gid }, index) => {
        const radius = 58 * Math.sqrt(index);
        return [gid, {
          x: radius * Math.cos(index * angle),
          y: radius * Math.sin(index * angle),
        }];
      }),
  );
}

type LabelNode = {
  id: string;
  x: number;
  y: number;
  radius: number;
  priority: number;
};

export function visibleGraphLabels(
  nodes: readonly LabelNode[],
  viewport: { width: number; height: number },
) {
  type Box = { left: number; right: number; top: number; bottom: number };
  const overlaps = (a: Box, b: Box) => a.left < b.right && a.right > b.left &&
    a.top < b.bottom && a.bottom > b.top;
  const bodies = nodes.map((node) => ({
    id: node.id,
    left: node.x - node.radius - 3,
    right: node.x + node.radius + 3,
    top: node.y - node.radius - 3,
    bottom: node.y + node.radius + 3,
  }));
  const occupied: Box[] = [];
  const visible = new Set<string>();
  const limit = Math.min(30, Math.max(1, Math.floor(viewport.width * viewport.height / 6500)));
  const ordered = [...nodes].sort((a, b) => b.priority - a.priority ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const node of ordered) {
    const halfWidth = Math.min(156, node.id.length * 7.4 + 12) / 2;
    const box = {
      left: node.x - halfWidth,
      right: node.x + halfWidth,
      top: node.y + node.radius + 6,
      bottom: node.y + node.radius + 25,
    };
    if (box.left < 10 || box.right > viewport.width - 44 ||
      box.top < 58 || box.bottom > viewport.height - 64 ||
      (box.left < 52 && box.bottom > viewport.height - 180)) continue;
    if (occupied.some((other) => overlaps(box, other))) continue;
    // The focused/hovered identifier remains available even in a dense overview.
    if (node.priority < 2 && bodies.some((body) => body.id !== node.id && overlaps(box, body))) continue;
    visible.add(node.id);
    occupied.push(box);
    if (visible.size >= limit) break;
  }
  return visible;
}
