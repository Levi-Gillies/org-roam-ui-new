import { OrgRoamNode } from '../api'
import { initialColoring, initialVisuals } from '../components/config'
import { LinksByNodeId } from '../pages'
import { getNodeColorById } from './getNodeColorById'
import { getThemeColor } from './getThemeColor'

export const getNodeColor = ({
  node,
  theme,
  highlightedNodes,
  previouslyHighlightedNodes,
  visuals,
  tagColors,
  highlightColors,
  opacity,
  emacsNodeId,
  linksByNodeId,
  cluster,
  coloring,
}: {
  node: OrgRoamNode
  theme: any
  visuals: typeof initialVisuals
  highlightedNodes: Record<string, any>
  previouslyHighlightedNodes: Record<string, any>
  tagColors: Record<string, any>
  highlightColors: Record<string, any>
  opacity: number
  emacsNodeId: string | null
  linksByNodeId: LinksByNodeId
  cluster: any
  coloring: typeof initialColoring
}) => {
  const needsHighlighting = highlightedNodes[node.id!] || previouslyHighlightedNodes[node.id!]
  //const needsHighlighting = hoverNode?.id === node.id! || lastHoverNode?.current?.id === node.id
  // if we are matching the node color and don't have a highlight color
  // or we don't have our own scheme and we're not being highlighted
  if (visuals.emacsNodeColor && node.id === emacsNodeId) {
    return getThemeColor(visuals.emacsNodeColor, theme)
  }
  if (tagColors && node?.tags.some((tag) => tagColors[tag])) {
    const tagColor = tagColors[node?.tags.filter((tag) => tagColors[tag])[0]]
    if (needsHighlighting) {
      return highlightColors[tagColor]?.[tagColor]?.(visuals.highlightFade * opacity) ??
        getThemeColor(tagColor, theme)
    }
    return highlightColors[tagColor]?.[visuals.backgroundColor]?.(visuals.highlightFade * opacity) ??
      getThemeColor(tagColor, theme)
  }
  if (visuals.citeNodeColor && node?.properties?.ROAM_REFS && node?.properties?.FILELESS) {
    if (needsHighlighting) {
      return getThemeColor(visuals.citeNodeColor, theme)
    }
    return highlightColors[visuals.citeNodeColor]?.[visuals.backgroundColor]?.(
      visuals.highlightFade * opacity,
    ) ?? getThemeColor(visuals.citeNodeColor, theme)
  }
  if (visuals.refNodeColor && node.properties.ROAM_REFS) {
    if (needsHighlighting) {
      return getThemeColor(visuals.refNodeColor, theme)
    }
    return highlightColors[visuals.refNodeColor]?.[visuals.backgroundColor]?.(
      visuals.highlightFade * opacity,
    ) ?? getThemeColor(visuals.refNodeColor, theme)
  }
  if (!needsHighlighting) {
    const nodeColorId = getNodeColorById({ id: node.id as string, cluster, coloring, linksByNodeId, visuals })
    return highlightColors[nodeColorId]?.[visuals.backgroundColor]?.(visuals.highlightFade * opacity) ??
      getThemeColor(nodeColorId, theme)
  }
  if (!visuals.nodeHighlight) {
    return getThemeColor(
      getNodeColorById({ id: node.id as string, cluster, coloring, linksByNodeId, visuals }),
      theme,
    )
  }
  const nodeColorId = getNodeColorById({ id: node.id as string, cluster, coloring, linksByNodeId, visuals })
  return highlightColors[nodeColorId]?.[visuals.nodeHighlight]?.(opacity) ??
    getThemeColor(nodeColorId, theme)
}
