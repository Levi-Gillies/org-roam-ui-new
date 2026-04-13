import { OrgRoamNode } from '../../api'
import { NodeObject } from 'force-graph'
import { initialVisuals } from '../config'
import { LinksByNodeId } from '../../pages'
import wrap from 'word-wrap'
import { nodeSize } from '../../util/nodeSize'
import { hexToRGBA } from '../../util/hexToRGBA'

export interface drawLabelsProps {
  labelBackgroundColor: string
  labelTextColor: string
  node: NodeObject
  ctx: any
  globalScale: number
  highlightedNodes: { [id: string]: {} }
  previouslyHighlightedNodes: { [id: string]: {} }
  visuals: typeof initialVisuals
  opacity: number
  filteredLinksByNodeId: LinksByNodeId
  nodeRel: number
  hoverNode: NodeObject | null
  lastHoverNode: OrgRoamNode | null
}

export const getLabelOpacity = (
  fadeFactor: number,
  visuals: typeof initialVisuals,
  globalScale: number,
  opacity: number,
  isHighlighty: boolean,
) => {
  return isHighlighty
    ? Math.max(fadeFactor, opacity)
    : 1 * fadeFactor * (-1 * (visuals.highlightFade * opacity - 1))
}

export function drawLabels(props: drawLabelsProps) {
  const {
    node,
    ctx,
    globalScale,
    highlightedNodes,
    previouslyHighlightedNodes,
    visuals,
    opacity,
    filteredLinksByNodeId,
    nodeRel,
    hoverNode,
    lastHoverNode,
  } = props

  if (!node) {
    return
  }

  if (!visuals.labels) {
    return
  }
  const hoverId = hoverNode?.id ?? ''
  const lastHoverId = lastHoverNode?.id ?? ''
  const links = filteredLinksByNodeId[(node as OrgRoamNode).id] ?? []

  const isHighlighty = !!(highlightedNodes[node.id!] || previouslyHighlightedNodes[node.id!])

  const fadeFactor = Math.min(
    5 * (globalScale - visuals.labelScale) +
      2 *
        Math.pow(Math.min(links.length, visuals.labelDynamicDegree), visuals.labelDynamicStrength),
    1,
  )
  if (fadeFactor < 0.01 && !isHighlighty) {
    return
  }
  const nodeTitle = (node as OrgRoamNode).title ?? ''

  const label = nodeTitle.substring(0, visuals.labelLength)

  const nodeS = Math.cbrt(
    (visuals.nodeRel *
      nodeSize({
        node,
        highlightedNodes,
        linksByNodeId: filteredLinksByNodeId,
        opacity,
        previouslyHighlightedNodes,
        visuals,
      })) /
      Math.pow(globalScale, visuals.nodeZoomSize),
  )
  const fontSize = visuals.labelFontSize / Math.cbrt(Math.pow(globalScale, visuals.nodeZoomSize))
  const textOpacity = getLabelOpacity(fadeFactor, visuals, globalScale, opacity, isHighlighty)

  // draw label text
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const labelText = hexToRGBA('black', textOpacity)
  ctx.fillStyle = labelText
  ctx.font = `${fontSize}px 'VT323', 'Courier New', monospace`
  const wordsArray = wrap(label, { width: visuals.labelWordWrap }).split('\n')

  const truncatedWords =
    nodeTitle.length > visuals.labelLength
      ? [...wordsArray.slice(0, -1), `${wordsArray.slice(-1)}...`]
      : wordsArray

  const highlightedNodeOffset = [hoverId, lastHoverId].includes((node as OrgRoamNode).id)
    ? 1 + 0.3 * opacity
    : 1
  const lineCount = truncatedWords.length
  const lineHeight = visuals.labelLineSpace * fontSize
  const startY = node.y! - highlightedNodeOffset * nodeS * 8 - lineHeight * (lineCount - 1)
  truncatedWords.forEach((word, index) => {
    ctx.fillText(
      word,
      node.x!,
      startY + lineHeight * index,
    )
  })
}
