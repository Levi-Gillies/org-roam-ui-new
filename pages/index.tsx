import {
  Button,
  Box,
  Flex,
  useDisclosure,
  useOutsideClick,
  useTheme,
} from '@chakra-ui/react'
import { useAnimation } from '@lilib/hooks'
import { useWindowSize } from '@react-hook/window-size'
import * as d3int from 'd3-interpolate'
import { GraphData, NodeObject } from 'force-graph'
import Head from 'next/head'
import React, {
  ComponentPropsWithoutRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
//@ts-expect-error
import jLouvain from 'jlouvain.js'
import type {
  ForceGraph2D as TForceGraph2D,
  ForceGraph3D as TForceGraph3D,
} from 'react-force-graph'
import ReconnectingWebSocket from 'reconnecting-websocket'
import SpriteText from 'three-spritetext'
import useUndo from 'use-undo'
import { OrgRoamGraphReponse, OrgRoamLink, OrgRoamNode } from '../api'
import {
  algos,
  colorList,
  initialBehavior,
  initialColoring,
  initialFilter,
  initialLocal,
  initialMouse,
  initialPhysics,
  initialVisuals,
  TagColors,
} from '../components/config'
import { ContextMenu } from '../components/contextmenu'
import Sidebar from '../components/Sidebar'
import { usePersistantState } from '../util/persistant-state'
import { ThemeContext, ThemeContextProps } from '../util/themecontext'
import { openNodeInEmacs } from '../util/webSocketFunctions'
import { drawLabels } from '../components/Graph/drawLabels'
import { VariablesContext } from '../util/variablesContext'
import { findNthNeighbors } from '../util/findNthNeighbour'
import { getThemeColor } from '../util/getThemeColor'
import { interpolateColors } from '../util/interpolateColors'
import { normalizeLinkEnds } from '../util/normalizeLinkEnds'
import { nodeSize } from '../util/nodeSize'
import { getNodeColor } from '../util/getNodeColor'
import { isLinkRelatedToNode } from '../util/isLinkRelatedToNode'
import { getLinkColor } from '../util/getLinkColor'
import VimHelp from '../components/VimHelp'

const d3promise = import('d3-force-3d')

// react-force-graph fails on import when server-rendered
// https://github.com/vasturiano/react-force-graph/issues/155
const ForceGraph2D = (
  !!global.window ? require('react-force-graph').ForceGraph2D : null
) as typeof TForceGraph2D

const ForceGraph3D = (
  !!global.window ? require('react-force-graph').ForceGraph3D : null
) as typeof TForceGraph3D

export type NodeById = { [nodeId: string]: OrgRoamNode | undefined }
export type LinksByNodeId = { [nodeId: string]: OrgRoamLink[] | undefined }
export type NodesByFile = { [file: string]: OrgRoamNode[] | undefined }
export type NodeByCite = { [key: string]: OrgRoamNode | undefined }
export interface EmacsVariables {
  roamDir?: string
  dailyDir?: string
  katexMacros?: { [key: string]: string }
  attachDir?: string
  useInheritance?: boolean
  subDirs: string[]
}
export type Tags = string[]
export type Scope = {
  nodeIds: string[]
  excludedNodeIds: string[]
}

interface SearchBarProps {
  graphData: GraphData | null
  nodeById: NodeById
  setPreviewNode: any
  graphRef: any
  threeDim: boolean
  visible: boolean
  onHide: () => void
  inputRef: React.RefObject<HTMLInputElement>
  aboveSidebar?: boolean
}

function SearchBar({ graphData, nodeById, setPreviewNode, graphRef, threeDim, visible, onHide, inputRef, aboveSidebar }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OrgRoamNode[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query.trim() || !graphData) {
      setResults([])
      setShowResults(false)
      return
    }
    const q = query.toLowerCase()
    const matches = graphData.nodes
      .filter((node: any) => {
        const n = node as OrgRoamNode
        return n.title && n.title.toLowerCase().includes(q)
      })
      .slice(0, 20) as OrgRoamNode[]
    setResults(matches)
    setActiveIndex(0)
    setShowResults(matches.length > 0)
  }, [query, graphData])

  const selectNode = (node: OrgRoamNode) => {
    setPreviewNode(node)
    setQuery('')
    setShowResults(false)
    onHide()

    // Zoom to node — x/y/z are added at runtime by force-graph
    const fg = graphRef.current
    const n = node as any
    if (fg && n.x !== undefined && n.y !== undefined) {
      if (threeDim) {
        const distance = 200
        const distRatio = 1 + distance / Math.hypot(n.x, n.y, n.z || 0)
        fg.cameraPosition(
          { x: n.x * distRatio, y: n.y * distRatio, z: (n.z || 0) * distRatio },
          { x: n.x, y: n.y, z: n.z || 0 },
          1000,
        )
      } else {
        fg.centerAt(n.x, n.y, 1000)
        fg.zoom(4, 1000)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault()
      selectNode(results[activeIndex])
    } else if (e.key === 'Escape') {
      setQuery('')
      setShowResults(false)
      inputRef.current?.blur()
      onHide()
    }
  }

  return (
    <div className={`search-container${visible ? '' : ' hidden'}${aboveSidebar ? ' search-above-sidebar' : ''}`} ref={containerRef}>
      <input
        ref={inputRef}
        className="search-input"
        type="text"
        placeholder="Search nodes..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setShowResults(true)}
        onBlur={() => setTimeout(() => setShowResults(false), 200)}
      />
      {showResults && (
        <div className="search-results">
          {results.map((node, i) => (
            <div
              key={node.id}
              className={`search-result-item${i === activeIndex ? ' active' : ''}`}
              onMouseDown={() => selectNode(node)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {node.title}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const extractNodeTextFromFile = (fileContent: string, node: OrgRoamNode) => {
  if (!node.level) {
    return fileContent
  }

  const lines = fileContent.split('\n')
  let charCount = 0
  let headingLineIdx = -1

  for (let index = 0; index < lines.length; index += 1) {
    if (charCount >= node.pos) {
      headingLineIdx = index
      break
    }
    charCount += lines[index].length + 1
  }

  if (headingLineIdx === -1) {
    return fileContent
  }

  let endLineIdx = lines.length
  for (let index = headingLineIdx + 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\*+)\s/)
    if (match && match[1].length <= node.level) {
      endLineIdx = index
      break
    }
  }

  return lines.slice(headingLineIdx, endLineIdx).join('\n')
}

export default function Home() {
  // only render on the client
  const [showPage, setShowPage] = useState(false)
  useEffect(() => {
    setShowPage(true)
  }, [])

  if (!showPage) {
    return null
  }
  return (
    <>
      <Head>
        <title>ORUI</title>
      </Head>
      <GraphPage />
    </>
  )
}

export function GraphPage() {
  const [threeDim, setThreeDim] = usePersistantState('3d', false)
  const [tagColors, setTagColors] = usePersistantState<TagColors>('tagCols', {})
  const [scope, setScope] = useState<Scope>({ nodeIds: [], excludedNodeIds: [] })

  const [physics, setPhysics] = usePersistantState('physics', initialPhysics)
  const [filter, setFilter] = usePersistantState('filter', initialFilter)
  const [visuals, setVisuals] = usePersistantState('visuals', initialVisuals)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [emacsNodeId, setEmacsNodeId] = useState<string | null>(null)
  const [behavior, setBehavior] = usePersistantState('behavior', initialBehavior)
  const [mouse, setMouse] = usePersistantState('mouse', initialMouse)
  const [coloring, setColoring] = usePersistantState('coloring', initialColoring)
  const [local, setLocal] = usePersistantState('local', initialLocal)

  const [
    previewNodeState,
    {
      set: setPreviewNode,
      undo: previousPreviewNode,
      redo: nextPreviewNode,
      canUndo,
      canRedo,
    },
  ] = useUndo<NodeObject>({})
  const { present: previewNode } = previewNodeState
  const [sidebarHighlightedNode, setSidebarHighlightedNode] = useState<OrgRoamNode | null>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()

  // Keyboard and touch control state
  const [touchControlsVisible, setTouchControlsVisible] = useState(false)
  const [searchVisible, setSearchVisible] = useState(false)
  const [showVimHelp, setShowVimHelp] = useState(false)
  const [vimMode, setVimMode] = useState<'normal' | 'search' | 'inNodeSearch'>('normal')
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const sidebarScrollRef = useRef<any>(null)
  const pendingKeyTimerRef = useRef<any>(null)

  // Collapse state (lifted from Sidebar for Tab keybinding)
  const [collapse, setCollapse] = useState(false)

  // Dedicated node editor state
  const [isEditorMode, setIsEditorMode] = useState(false)
  const [editorText, setEditorText] = useState('')
  const [editorSavedText, setEditorSavedText] = useState('')
  const [editorStatusMessage, setEditorStatusMessage] = useState('')
  const [previewRefreshToken, setPreviewRefreshToken] = useState(0)
  const [isEditorSaving, setIsEditorSaving] = useState(false)
  const editorNodeRef = useRef<OrgRoamNode | null>(null)

  // In-node search state
  const [inNodeSearch, setInNodeSearch] = useState(false)
  const [inNodeSearchQuery, setInNodeSearchQuery] = useState('')
  const [inNodeSearchMatches, setInNodeSearchMatches] = useState<Range[]>([])
  const [inNodeSearchCurrentIndex, setInNodeSearchCurrentIndex] = useState(0)

  const nodeByIdRef = useRef<NodeById>({})
  const linksByNodeIdRef = useRef<LinksByNodeId>({})
  const nodeByCiteRef = useRef<NodeByCite>({})
  const tagsRef = useRef<Tags>([])
  const graphRef = useRef<any>(null)
  const [emacsVariables, setEmacsVariables] = useState<EmacsVariables>({} as EmacsVariables)
  const clusterRef = useRef<{ [id: string]: number }>({})

  const currentGraphDataRef = useRef<GraphData>({ nodes: [], links: [] })
  const editorDirty = isEditorMode && editorText !== editorSavedText

  const clearInNodeSearch = useCallback(() => {
    setInNodeSearch(false)
    setInNodeSearchQuery('')
    setInNodeSearchMatches([])
    setInNodeSearchCurrentIndex(0)
    if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
      ;(CSS as any).highlights.delete('in-node-search')
      ;(CSS as any).highlights.delete('in-node-search-current')
    }
  }, [])

  const closePreview = useCallback(() => {
    setIsEditorMode(false)
    setEditorText('')
    setEditorSavedText('')
    setEditorStatusMessage('')
    editorNodeRef.current = null
    clearInNodeSearch()
    setSearchVisible(false)
    setVimMode('normal')
    onClose()
    setPreviewNode({})
  }, [clearInNodeSearch, onClose, setPreviewNode])

  const updateGraphData = (orgRoamGraphData: OrgRoamGraphReponse) => {
    const oldNodeById = nodeByIdRef.current
    tagsRef.current = orgRoamGraphData.tags ?? []
    const importNodes = orgRoamGraphData.nodes ?? []
    const importLinks = orgRoamGraphData.links ?? []
    const nodesByFile = importNodes.reduce<NodesByFile>((acc, node) => {
      return {
        ...acc,
        [node.file]: [...(acc[node.file] ?? []), node],
      }
    }, {})

    // generate links between level 2 nodes and the level 1 node above it
    // org-roam does not generate such links, so we have to put them in ourselves
    const headingLinks: OrgRoamLink[] = Object.keys(nodesByFile).flatMap((file) => {
      const nodesInFile = nodesByFile[file] ?? []
      // "file node" as opposed to "heading node"
      const fileNode = nodesInFile.find((node) => node.level === 0)
      const headingNodes = nodesInFile.filter((node) => node.level !== 0)

      if (!fileNode) {
        return []
      }
      return headingNodes.map((headingNode) => {
        const smallerHeadings = nodesInFile.filter((node) => {
          if (
            node.level >= headingNode.level ||
            node.pos >= headingNode.pos ||
            !headingNode.olp?.includes((node.title as string)?.replace(/ *\[\d*\/\d*\] */g, ''))
          ) {
            return false
          }
          return true
        })

        // get the nearest heading
        const target = smallerHeadings.reduce((acc, node) => {
          if (node.level > acc.level) {
            acc = node
          }
          return acc
        }, fileNode)

        return {
          source: headingNode.id,
          target: target?.id || fileNode.id,
          type: 'heading',
        }
      })
    })

    // we want to support both linking to only the file node and to the next heading
    // to do this we need both links, as we can't really toggle between them without
    // recalculating the entire graph otherwise
    const fileLinks: OrgRoamLink[] = Object.keys(nodesByFile).flatMap((file) => {
      const nodesInFile = nodesByFile[file] ?? []
      // "file node" as opposed to "heading node"
      const fileNode = nodesInFile.find((node) => node.level === 0)
      const headingNodes = nodesInFile.filter((node) => node.level !== 0)

      if (!fileNode) {
        return []
      }
      return headingNodes.map((headingNode) => {
        return {
          source: headingNode.id,
          target: fileNode.id,
          type: 'parent',
        }
      })
    })

    nodeByIdRef.current = Object.fromEntries(importNodes.map((node) => [node.id, node]))
    const dirtyLinks = [...importLinks, ...headingLinks, ...fileLinks]
    const nonExistantNodes: OrgRoamNode[] = []
    const links = dirtyLinks.map((link) => {
      const sourceId = link.source as string
      const targetId = link.target as string
      if (!nodeByIdRef.current[sourceId]) {
        nonExistantNodes.push({
          id: sourceId,
          tags: ['bad'],
          properties: { FILELESS: 'yes', bad: 'yes' },
          file: '',
          title: sourceId,
          level: 0,
          pos: 0,
          olp: null,
        })
        return { ...link, type: 'bad' }
      }
      if (!nodeByIdRef.current[targetId]) {
        nonExistantNodes.push({
          id: targetId,
          tags: ['bad'],
          properties: { FILELESS: 'yes', bad: 'yes' },
          file: '',
          title: targetId,
          level: 0,
          pos: 0,
          olp: null,
        })
        return { ...link, type: 'bad' }
      }
      return link
    })

    nodeByIdRef.current = {
      ...nodeByIdRef.current,
      ...Object.fromEntries(nonExistantNodes.map((node) => [node.id, node])),
    }

    linksByNodeIdRef.current = links.reduce<LinksByNodeId>((acc, link) => {
      return {
        ...acc,
        [link.source]: [...(acc[link.source] ?? []), link],
        [link.target]: [...(acc[link.target] ?? []), link],
      }
    }, {})

    const nodes = [...importNodes, ...nonExistantNodes]

    nodeByCiteRef.current = nodes.reduce<NodeByCite>((acc, node) => {
      const ref = node.properties?.ROAM_REFS as string
      if (!ref?.includes('cite')) {
        return acc
      }
      const key = ref.replaceAll(/cite:(.*)/g, '$1')
      if (!key) {
        return acc
      }
      return {
        ...acc,
        [key]: node,
      }
    }, {})

    const orgRoamGraphDataProcessed = {
      nodes,
      links,
    }

    const currentGraphData = currentGraphDataRef.current
    if (currentGraphData.nodes.length === 0) {
      // react-force-graph modifies the graph data implicitly,
      // so we make sure there's no overlap between the objects we pass it and
      // nodeByIdRef, linksByNodeIdRef
      const orgRoamGraphDataClone = JSON.parse(JSON.stringify(orgRoamGraphDataProcessed))
      currentGraphDataRef.current = orgRoamGraphDataClone
      setGraphData(orgRoamGraphDataClone)
      return
    }

    const newNodes = [
      ...currentGraphData.nodes.flatMap((node: NodeObject) => {
        const newNode = nodeByIdRef.current[node?.id!] ?? false
        if (!newNode) {
          return []
        }
        return [{ ...node, ...newNode }]
      }),
      ...Object.keys(nodeByIdRef.current)
        .filter((id) => !oldNodeById[id])
        .map((id) => {
          return nodeByIdRef.current[id] as NodeObject
        }),
    ]

    const nodeIndex = newNodes.reduce<{ [id: string]: number }>((acc, node, index) => {
      const id = node?.id as string
      return {
        ...acc,
        [id]: index,
      }
    }, {})

    const newerLinks = links.map((link) => {
      const [source, target] = normalizeLinkEnds(link)
      return {
        ...link,
        source: newNodes[nodeIndex![source]],
        target: newNodes[nodeIndex![target]],
      }
    })

    setGraphData({ nodes: newNodes as NodeObject[], links: newerLinks })
  }
  useEffect(() => {
    if (!graphData) {
      return
    }
    currentGraphDataRef.current = graphData
  }, [graphData])

  useEffect(() => {
    const currentPreviewId = (previewNode as OrgRoamNode)?.id
    if (!currentPreviewId) {
      return
    }
    if (isEditorMode && editorNodeRef.current?.id !== currentPreviewId) {
      setIsEditorMode(false)
      setEditorText('')
      setEditorSavedText('')
      setEditorStatusMessage('')
      editorNodeRef.current = null
    }
  }, [isEditorMode, previewNode])

  const { setEmacsTheme } = useContext(ThemeContext)

  const scopeRef = useRef<Scope>({ nodeIds: [], excludedNodeIds: [] })
  const behaviorRef = useRef(initialBehavior)
  behaviorRef.current = behavior
  const WebSocketRef = useRef<ReconnectingWebSocket | null>(null)

  scopeRef.current = scope
  const followBehavior = (
    command: string,
    emacsNode: string,
    speed: number = 2000,
    padding: number = 200,
  ) => {
    if (command === 'color') {
      return
    }
    const fg = graphRef.current
    const sr = scopeRef.current
    const bh = behaviorRef.current
    const links = linksByNodeIdRef.current[emacsNode] ?? []
    const nodes = Object.fromEntries(
      [emacsNode as string, ...links.flatMap((link) => [link.source, link.target])].map(
        (nodeId) => [nodeId, {}],
      ),
    )
    if (command === 'zoom') {
      if (sr.nodeIds.length) {
        setScope({ nodeIds: [], excludedNodeIds: [] })
      }
      setTimeout(
        () => fg.zoomToFit(speed, padding, (node: NodeObject) => nodes[node.id as string]),
        50,
      )
      return
    }
    if (!sr.nodeIds.length) {
      setScope((current: Scope) => ({ ...current, nodeIds: [emacsNode] }))
      setTimeout(() => {
        fg.centerAt(0, 0, 10)
        fg.zoomToFit(1, padding)
      }, 50)
      return
    }
    if (bh.localSame !== 'add') {
      setScope((current: Scope) => ({ ...current, nodeIds: [emacsNode] }))
      setTimeout(() => {
        fg.centerAt(0, 0, 10)
        fg.zoomToFit(1, padding)
      }, 50)
      return
    }

    // if the node is in the scoped nodes, add it to scope instead of replacing it
    if (
      !sr.nodeIds.includes(emacsNode) ||
      !sr.nodeIds.some((scopeId: string) => {
        return nodes[scopeId]
      })
    ) {
      setScope((current: Scope) => ({ ...current, nodeIds: [emacsNode] }))
      setTimeout(() => {
        fg.centerAt(0, 0, 10)
        fg.zoomToFit(1, padding)
      }, 50)
      return
    }
    setScope((currentScope: Scope) => ({
      ...currentScope,
      nodeIds: [...currentScope.nodeIds, emacsNode as string],
    }))
    setTimeout(() => {
      fg.centerAt(0, 0, 10)
      fg.zoomToFit(1, padding)
    }, 50)
  }

  useEffect(() => {
    // initialize websocket
    WebSocketRef.current = new ReconnectingWebSocket('ws://localhost:35903')
    WebSocketRef.current.addEventListener('open', () => {
      console.log('Connection with Emacs established')
    })
    WebSocketRef.current.addEventListener('message', (event: any) => {
      const bh = behaviorRef.current
      const message = JSON.parse(event.data)
      switch (message.type) {
        case 'graphdata':
          return updateGraphData(message.data)
        case 'variables':
          setEmacsVariables(message.data)
          console.log(message)
          return
        case 'theme':
          return setEmacsTheme(['custom', message.data])
        case 'command':
          switch (message.data.commandName) {
            case 'local':
              const speed = behavior.zoomSpeed
              const padding = behavior.zoomPadding
              followBehavior('local', message.data.id, speed, padding)
              setEmacsNodeId(message.data.id)
              break
            case 'zoom': {
              const speed = message?.data?.speed || bh.zoomSpeed
              const padding = message?.data?.padding || bh.zoomPadding
              followBehavior('zoom', message.data.id, speed, padding)
              setEmacsNodeId(message.data.id)
              break
            }
            case 'follow': {
              followBehavior(bh.follow, message.data.id, bh.zoomSpeed, bh.zoomPadding)
              setEmacsNodeId(message.data.id)
              break
            }
            case 'change-local-graph': {
              const node = nodeByIdRef.current[message.data.id as string]
              if (!node) break
              console.log(message)
              handleLocal(node, message.data.manipulation)
              break
            }
            default:
              return console.error('unknown message type', message.type)
          }
      }
    })
  }, [])

  useEffect(() => {
    const fg = graphRef.current
    if (!fg || scope.nodeIds.length > 1) {
      return
    }
    if (!scope.nodeIds.length && physics.gravityOn) {
      fg.zoomToFit()
      return
    }
    setTimeout(() => {
      fg.zoomToFit(5, 200)
    }, 50)
  }, [scope.nodeIds])

  // Zoom to current preview node helper
  const zoomToPreviewNode = useCallback(() => {
    const fg = graphRef.current
    const n = previewNode as any
    if (!fg || n.x === undefined || n.y === undefined) return
    if (threeDim) {
      const distance = 200
      const distRatio = 1 + distance / Math.hypot(n.x, n.y, n.z || 0)
      fg.cameraPosition(
        { x: n.x * distRatio, y: n.y * distRatio, z: (n.z || 0) * distRatio },
        { x: n.x, y: n.y, z: n.z || 0 },
        1000,
      )
    } else {
      fg.centerAt(n.x, n.y, 1000)
      fg.zoom(4, 1000)
    }
  }, [previewNode, threeDim])

  const fetchNodeText = useCallback(async (node: OrgRoamNode) => {
    const encodedId = encodeURIComponent(encodeURIComponent(node.id))

    try {
      const res = await fetch(`http://localhost:35901/node/${encodedId}`)
      if (res.ok) {
        const text = await res.text()
        if (text !== 'error') {
          return text
        }
      }
    } catch {}

    if (!node.file) {
      return ''
    }

    try {
      const fileRes = await fetch(`/api/notes/${encodeURIComponent(node.file)}`)
      if (fileRes.ok) {
        const fileText = await fileRes.text()
        return extractNodeTextFromFile(fileText, node)
      }
    } catch {}

    return ''
  }, [])

  const openVimEditor = useCallback(async () => {
    const node = previewNode as OrgRoamNode
    if (!node?.id) {
      return
    }

    const text = await fetchNodeText(node)
    editorNodeRef.current = node
    setEditorText(text)
    setEditorSavedText(text)
    setEditorStatusMessage('Vim editor ready. Use :w to save or :wq to save and return.')
    clearInNodeSearch()
    setVimMode('normal')
    setIsEditorMode(true)
  }, [clearInNodeSearch, fetchNodeText, previewNode])

  const saveEditor = useCallback(async () => {
    const node = editorNodeRef.current
    if (!node) {
      return false
    }

    setIsEditorSaving(true)
    setEditorStatusMessage('Saving...')

    try {
      const res = await fetch('/api/save-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: node.file,
          content: editorText,
          pos: node.pos,
          level: node.level,
        }),
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || 'Save failed')
      }

      setEditorSavedText(editorText)
      setPreviewRefreshToken((value) => value + 1)
      setEditorStatusMessage('Saved')
      return true
    } catch (error: any) {
      setEditorStatusMessage(error?.message || 'Save failed')
      return false
    } finally {
      setIsEditorSaving(false)
    }
  }, [editorText])

  const quitEditor = useCallback(async (force = false) => {
    if (editorDirty && !force) {
      setEditorStatusMessage('Unsaved changes. Use :wq to save or :q! to discard.')
      return false
    }

    setIsEditorMode(false)
    setEditorStatusMessage('')
    clearInNodeSearch()
    setVimMode('normal')
    return true
  }, [clearInNodeSearch, editorDirty])

  const writeQuitEditor = useCallback(async () => {
    const saved = await saveEditor()
    if (!saved) {
      return false
    }

    setIsEditorMode(false)
    setEditorStatusMessage('')
    clearInNodeSearch()
    setVimMode('normal')
    return true
  }, [clearInNodeSearch, saveEditor])

  // In-node search: find and highlight matches when query changes
  useEffect(() => {
    if (!inNodeSearch || !inNodeSearchQuery) {
      setInNodeSearchMatches([])
      setInNodeSearchCurrentIndex(0)
      if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
        ;(CSS as any).highlights.delete('in-node-search')
        ;(CSS as any).highlights.delete('in-node-search-current')
      }
      return
    }

    const sidebar = document.querySelector('.floating-sidebar')
    if (!sidebar) return

    const ranges: Range[] = []
    const walker = document.createTreeWalker(sidebar, NodeFilter.SHOW_TEXT)
    const query = inNodeSearchQuery.toLowerCase()

    let textNode: Text | null
    while ((textNode = walker.nextNode() as Text | null)) {
      const text = textNode.textContent?.toLowerCase() || ''
      let startPos = 0
      while (startPos < text.length) {
        const idx = text.indexOf(query, startPos)
        if (idx === -1) break
        const range = new Range()
        range.setStart(textNode, idx)
        range.setEnd(textNode, idx + query.length)
        ranges.push(range)
        startPos = idx + 1
      }
    }

    setInNodeSearchMatches(ranges)
    setInNodeSearchCurrentIndex(0)
  }, [inNodeSearchQuery, inNodeSearch])

  // In-node search: update CSS Custom Highlights when matches or index changes
  useEffect(() => {
    if (typeof CSS === 'undefined' || !('highlights' in CSS)) return
    if (inNodeSearchMatches.length === 0) {
      ;(CSS as any).highlights.delete('in-node-search')
      ;(CSS as any).highlights.delete('in-node-search-current')
      return
    }

    const otherRanges = inNodeSearchMatches.filter((_, i) => i !== inNodeSearchCurrentIndex)
    const currentRange = inNodeSearchMatches[inNodeSearchCurrentIndex]

    if (otherRanges.length > 0) {
      ;(CSS as any).highlights.set('in-node-search', new (window as any).Highlight(...otherRanges))
    } else {
      ;(CSS as any).highlights.delete('in-node-search')
    }

    if (currentRange) {
      ;(CSS as any).highlights.set('in-node-search-current', new (window as any).Highlight(currentRange))
      // Scroll match into view
      const el = currentRange.startContainer.parentElement
      el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    }
  }, [inNodeSearchMatches, inNodeSearchCurrentIndex])

  // Global vim keybindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditorMode) {
        return
      }

      const tag = (document.activeElement?.tagName || '').toLowerCase()
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select'

      // Search mode — only handle Escape to exit
      if (vimMode === 'search') {
        if (e.key === 'Escape') {
          setVimMode('normal')
          if (!touchControlsVisible) {
            setSearchVisible(false)
          }
          searchInputRef.current?.blur()
        }
        return
      }

      // In-node search mode
      if (vimMode === 'inNodeSearch') {
        if (e.key === 'Escape') {
          setVimMode('normal')
          clearInNodeSearch()
        } else if (e.key === 'Enter') {
          if (e.shiftKey) {
            if (inNodeSearchMatches.length > 0) {
              const prevIdx =
                (inNodeSearchCurrentIndex - 1 + inNodeSearchMatches.length) %
                inNodeSearchMatches.length
              setInNodeSearchCurrentIndex(prevIdx)
            }
          } else {
            if (inNodeSearchMatches.length > 0) {
              const nextIdx = (inNodeSearchCurrentIndex + 1) % inNodeSearchMatches.length
              setInNodeSearchCurrentIndex(nextIdx)
            }
          }
        } else if (e.key === 'Backspace') {
          setInNodeSearchQuery((q) => q.slice(0, -1))
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault()
          setInNodeSearchQuery((q) => q + e.key)
        }
        return
      }

      // Normal mode — ignore if user is in an input field
      if (isInput) {
        return
      }

      // Pending key sequences (gg, zz)
      if (pendingKey === 'g') {
        if (e.key === 'g') {
          e.preventDefault()
          sidebarScrollRef.current?.scrollTop(0)
        }
        setPendingKey(null)
        if (pendingKeyTimerRef.current) clearTimeout(pendingKeyTimerRef.current)
        return
      }
      if (pendingKey === 'z') {
        if (e.key === 'z') {
          e.preventDefault()
          zoomToPreviewNode()
        }
        setPendingKey(null)
        if (pendingKeyTimerRef.current) clearTimeout(pendingKeyTimerRef.current)
        return
      }

      switch (e.key) {
        case '/':
          e.preventDefault()
          if (isOpen) {
            setInNodeSearch(true)
            setInNodeSearchQuery('')
            setInNodeSearchMatches([])
            setInNodeSearchCurrentIndex(0)
            setVimMode('inNodeSearch')
          } else {
            setSearchVisible(true)
            setVimMode('search')
            setTimeout(() => searchInputRef.current?.focus(), 50)
          }
          break
        case 'Escape':
          if (showVimHelp) {
            setShowVimHelp(false)
          } else if (isOpen) {
            closePreview()
          }
          break
        case 't':
          e.preventDefault()
          setThreeDim((value) => !value)
          break
        case 'Tab':
          if (isOpen) {
            e.preventDefault()
            setCollapse((c: boolean) => !c)
          }
          break
        case '?':
          e.preventDefault()
          setShowVimHelp((v) => !v)
          break
        case 'e':
          if (isOpen) {
            e.preventDefault()
            void openVimEditor()
          }
          break
        case 'n':
          if (inNodeSearchMatches.length > 0) {
            e.preventDefault()
            const nextIdx = (inNodeSearchCurrentIndex + 1) % inNodeSearchMatches.length
            setInNodeSearchCurrentIndex(nextIdx)
          }
          break
        case 'N':
          if (inNodeSearchMatches.length > 0) {
            e.preventDefault()
            const prevIdx = (inNodeSearchCurrentIndex - 1 + inNodeSearchMatches.length) % inNodeSearchMatches.length
            setInNodeSearchCurrentIndex(prevIdx)
          }
          break
        case 'j':
          if (isOpen && sidebarScrollRef.current) {
            e.preventDefault()
            const current = sidebarScrollRef.current.getScrollTop()
            sidebarScrollRef.current.scrollTop(current + 60)
          }
          break
        case 'k':
          if (isOpen && sidebarScrollRef.current) {
            e.preventDefault()
            const current = sidebarScrollRef.current.getScrollTop()
            sidebarScrollRef.current.scrollTop(current - 60)
          }
          break
        case 'h':
          if (isOpen && canUndo) {
            e.preventDefault()
            previousPreviewNode()
          }
          break
        case 'l':
          if (isOpen && canRedo) {
            e.preventDefault()
            nextPreviewNode()
          }
          break
        case 'g':
          e.preventDefault()
          setPendingKey('g')
          pendingKeyTimerRef.current = setTimeout(() => setPendingKey(null), 500)
          break
        case 'G':
          if (isOpen && sidebarScrollRef.current) {
            e.preventDefault()
            sidebarScrollRef.current.scrollToBottom()
          }
          break
        case 'd':
          if (e.ctrlKey && isOpen && sidebarScrollRef.current) {
            e.preventDefault()
            const current = sidebarScrollRef.current.getScrollTop()
            const height = sidebarScrollRef.current.getClientHeight()
            sidebarScrollRef.current.scrollTop(current + height / 2)
          }
          break
        case 'u':
          if (e.ctrlKey && isOpen && sidebarScrollRef.current) {
            e.preventDefault()
            const current = sidebarScrollRef.current.getScrollTop()
            const height = sidebarScrollRef.current.getClientHeight()
            sidebarScrollRef.current.scrollTop(current - height / 2)
          }
          break
        case 'z':
          e.preventDefault()
          setPendingKey('z')
          pendingKeyTimerRef.current = setTimeout(() => setPendingKey(null), 500)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    canRedo,
    canUndo,
    clearInNodeSearch,
    closePreview,
    inNodeSearchCurrentIndex,
    inNodeSearchMatches,
    isEditorMode,
    isOpen,
    nextPreviewNode,
    openVimEditor,
    pendingKey,
    previousPreviewNode,
    setThreeDim,
    showVimHelp,
    touchControlsVisible,
    vimMode,
    zoomToPreviewNode,
  ])

  const [windowWidth, windowHeight] = useWindowSize()

  const contextMenuRef = useRef<any>()
  const [contextMenuTarget, setContextMenuTarget] = useState<OrgRoamNode | string | null>(null)
  type ContextPos = {
    left: number | undefined
    right: number | undefined
    top: number | undefined
    bottom: number | undefined
  }
  const [contextPos, setContextPos] = useState<ContextPos>({
    left: 0,
    top: 0,
    right: undefined,
    bottom: undefined,
  })

  const contextMenu = useDisclosure()
  useOutsideClick({
    ref: contextMenuRef,
    handler: () => {
      contextMenu.onClose()
    },
  })

  const openContextMenu = (target: OrgRoamNode | string, event: any, coords?: ContextPos) => {
    coords
      ? setContextPos(coords)
      : setContextPos({ left: event.pageX, top: event.pageY, right: undefined, bottom: undefined })
    setContextMenuTarget(target)
    contextMenu.onOpen()
  }

  const handleLocal = (node: OrgRoamNode, command: string) => {
    if (command === 'remove') {
      setScope((currentScope: Scope) => ({
        nodeIds: currentScope.nodeIds.filter((id: string) => id !== node.id),
        excludedNodeIds: [...currentScope.excludedNodeIds, node.id as string],
      }))
      return
    }
    if (command === 'replace') {
      setScope({ nodeIds: [node.id], excludedNodeIds: [] })
      return
    }
    if (scope.nodeIds.includes(node.id as string)) {
      return
    }
    setScope((currentScope: Scope) => ({
      excludedNodeIds: currentScope.excludedNodeIds.filter((id: string) => id !== node.id),
      nodeIds: [...currentScope.nodeIds, node.id as string],
    }))
    return
  }

  // const [mainItem, setMainItem] = useState({
  //   type: 'Graph',
  //   title: 'Graph',
  //   icon: <BiNetworkChart />,
  // })

  const [mainWindowWidth, setMainWindowWidth] = usePersistantState<number>(
    'mainWindowWidth',
    windowWidth,
  )
  const touchSearchVisible = touchControlsVisible || searchVisible

  const focusGraphSearch = useCallback(() => {
    setSearchVisible(true)
    setVimMode('search')
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }, [])

  const startInNodeSearch = useCallback(() => {
    setInNodeSearch(true)
    setInNodeSearchQuery('')
    setInNodeSearchMatches([])
    setInNodeSearchCurrentIndex(0)
    setVimMode('inNodeSearch')
  }, [])

  const scrollSidebarBy = useCallback((delta: number) => {
    if (!sidebarScrollRef.current) {
      return
    }
    const current = sidebarScrollRef.current.getScrollTop()
    sidebarScrollRef.current.scrollTop(current + delta)
  }, [])

  const scrollSidebarToEdge = useCallback((direction: 'top' | 'bottom') => {
    if (!sidebarScrollRef.current) {
      return
    }
    if (direction === 'top') {
      sidebarScrollRef.current.scrollTop(0)
      return
    }
    sidebarScrollRef.current.scrollToBottom()
  }, [])

  return (
    <VariablesContext.Provider value={{ ...emacsVariables }}>
      <Box
        display="flex"
        alignItems="flex-start"
        flexDirection="row"
        height="100vh"
        overflow="clip"
      >
        <SearchBar
          graphData={graphData}
          nodeById={nodeByIdRef.current!}
          setPreviewNode={setPreviewNode}
          graphRef={graphRef}
          threeDim={threeDim}
          visible={touchSearchVisible}
          onHide={() => {
            if (!touchControlsVisible) {
              setSearchVisible(false)
            }
            setVimMode('normal')
          }}
          inputRef={searchInputRef}
          aboveSidebar={isOpen}
        />
        {touchControlsVisible && (
          <>
            <Box className="touch-controls-top-left">
              <Button size="sm" onClick={() => setThreeDim((value) => !value)}>
                {threeDim ? '2D' : '3D'}
              </Button>
            </Box>
            <Box className="touch-controls-panel">
              <Flex className="touch-controls-group" gap={2} wrap="wrap" justify="flex-end">
                <Button size="sm" onClick={focusGraphSearch}>
                  Search
                </Button>
                <Button size="sm" onClick={() => setShowVimHelp((value) => !value)}>
                  Help
                </Button>
                {!isEditorMode && isOpen && (
                  <>
                    <Button size="sm" onClick={startInNodeSearch}>
                      Find
                    </Button>
                    <Button size="sm" onClick={() => void openVimEditor()}>
                      Vim
                    </Button>
                    <Button size="sm" onClick={closePreview}>
                      Close
                    </Button>
                    <Button size="sm" onClick={() => previousPreviewNode()} isDisabled={!canUndo}>
                      Prev
                    </Button>
                    <Button size="sm" onClick={() => nextPreviewNode()} isDisabled={!canRedo}>
                      Next
                    </Button>
                    <Button size="sm" onClick={() => setCollapse((value) => !value)}>
                      {collapse ? 'Expand' : 'Collapse'}
                    </Button>
                    <Button size="sm" onClick={() => scrollSidebarBy(-180)}>
                      Up
                    </Button>
                    <Button size="sm" onClick={() => scrollSidebarBy(180)}>
                      Down
                    </Button>
                    <Button size="sm" onClick={() => scrollSidebarToEdge('top')}>
                      Top
                    </Button>
                    <Button size="sm" onClick={() => scrollSidebarToEdge('bottom')}>
                      Bottom
                    </Button>
                  </>
                )}
                {isEditorMode && (
                  <>
                    <Button size="sm" onClick={() => void saveEditor()} isLoading={isEditorSaving}>
                      Save
                    </Button>
                    <Button size="sm" onClick={() => void writeQuitEditor()} isLoading={isEditorSaving}>
                      WQ
                    </Button>
                    <Button size="sm" onClick={() => void quitEditor()} isDisabled={isEditorSaving}>
                      View
                    </Button>
                    <Button size="sm" onClick={() => void quitEditor(true)} isDisabled={isEditorSaving}>
                      Discard
                    </Button>
                  </>
                )}
              </Flex>
            </Box>
          </>
        )}
        <Box className="touch-controls-toggle">
          <Button size="sm" onClick={() => setTouchControlsVisible((value) => !value)}>
            {touchControlsVisible ? 'Hide UI' : 'Show UI'}
          </Button>
        </Box>
        <Box position="absolute">
          {graphData && (
            <Graph
              //ref={graphRef}
              nodeById={nodeByIdRef.current!}
              linksByNodeId={linksByNodeIdRef.current!}
              webSocket={WebSocketRef.current}
              variables={emacsVariables}
              {...{
                physics,
                graphData,
                threeDim,
                emacsNodeId,
                filter,
                visuals,
                behavior,
                mouse,
                scope,
                setScope,
                tagColors,
                setPreviewNode,
                sidebarHighlightedNode,
                windowWidth,
                windowHeight,
                openContextMenu,
                contextMenu,
                handleLocal,
                mainWindowWidth,
                setMainWindowWidth,
                setContextMenuTarget,
                graphRef,
                clusterRef,
                coloring,
                local,
              }}
            />
          )}
        </Box>
        <Sidebar
          {...{
            isOpen,
            onOpen,
            onClose: closePreview,
            previewNode,
            setPreviewNode,
            setSidebarHighlightedNode,
            openContextMenu,
            scope,
            setScope,
            windowWidth,
            tagColors,
            setTagColors,
            filter,
            setFilter,
            collapse,
            setCollapse,
            isEditorMode,
            editorText,
            setEditorText,
            onSaveEditor: saveEditor,
            onWriteQuitEditor: writeQuitEditor,
            onQuitEditor: quitEditor,
            editorDirty,
            editorStatusMessage,
            previewRefreshToken,
            inNodeSearch,
            inNodeSearchQuery,
            inNodeSearchMatchCount: inNodeSearchMatches.length,
            inNodeSearchCurrentIndex,
          }}
          macros={emacsVariables.katexMacros}
          attachDir={emacsVariables.attachDir || ''}
          useInheritance={emacsVariables.useInheritance || false}
          nodeById={nodeByIdRef.current!}
          linksByNodeId={linksByNodeIdRef.current!}
          nodeByCite={nodeByCiteRef.current!}
          scrollRef={(instance: any) => { sidebarScrollRef.current = instance }}
        />
        {contextMenu.isOpen && (
          <div ref={contextMenuRef}>
            <ContextMenu
              //contextMenuRef={contextMenuRef}
              scope={scope}
              target={contextMenuTarget}
              background={false}
              coordinates={contextPos}
              handleLocal={handleLocal}
              menuClose={contextMenu.onClose.bind(contextMenu)}
              webSocket={WebSocketRef.current}
              setPreviewNode={setPreviewNode}
              setFilter={setFilter}
              filter={filter}
              setTagColors={setTagColors}
              tagColors={tagColors}
            />
          </div>
        )}
        {showVimHelp && (
          <VimHelp onClose={() => setShowVimHelp(false)} />
        )}
      </Box>
    </VariablesContext.Provider>
  )
}

export interface GraphProps {
  nodeById: NodeById
  linksByNodeId: LinksByNodeId
  graphData: GraphData
  physics: typeof initialPhysics
  threeDim: boolean
  filter: typeof initialFilter
  emacsNodeId: string | null
  visuals: typeof initialVisuals
  behavior: typeof initialBehavior
  mouse: typeof initialMouse
  local: typeof initialLocal
  scope: Scope
  setScope: any
  webSocket: any
  tagColors: { [tag: string]: string }
  setPreviewNode: any
  sidebarHighlightedNode: OrgRoamNode | null
  windowWidth: number
  windowHeight: number
  setContextMenuTarget: any
  openContextMenu: any
  contextMenu: any
  handleLocal: any
  mainWindowWidth: number
  setMainWindowWidth: any
  variables: EmacsVariables
  graphRef: any
  clusterRef: any
  coloring: typeof initialColoring
}

export const Graph = function (props: GraphProps) {
  const {
    graphRef,
    physics,
    graphData,
    threeDim,
    linksByNodeId,
    filter,
    emacsNodeId,
    nodeById,
    visuals,
    behavior,
    mouse,
    scope,
    local,
    setScope,
    webSocket,
    tagColors,
    setPreviewNode,
    sidebarHighlightedNode,
    windowWidth,
    windowHeight,
    setContextMenuTarget,
    openContextMenu,
    contextMenu,
    handleLocal,
    variables,
    clusterRef,
    coloring,
  } = props

  const { dailyDir, roamDir } = variables

  const [hoverNode, setHoverNode] = useState<NodeObject | null>(null)

  const theme = useTheme()

  const { emacsTheme } = useContext<ThemeContextProps>(ThemeContext)

  const handleClick = (click: string, node: OrgRoamNode, event: any) => {
    switch (click) {
      case mouse.preview: {
        setPreviewNode(node)
        break
      }
      case mouse.local: {
        handleLocal(node, behavior.localSame)
        break
      }
      case mouse.follow: {
        openNodeInEmacs(node, webSocket)
        break
      }
      case mouse.context: {
        openContextMenu(node, event)
      }
      default:
        break
    }
  }

  const centralHighlightedNode = useRef<NodeObject | null>(null)

  useEffect(() => {
    if (!emacsNodeId) {
      return
    }
    setHoverNode(nodeById[emacsNodeId] as NodeObject)
  }, [emacsNodeId])

  const filteredLinksByNodeIdRef = useRef<LinksByNodeId>({})

  const hiddenNodeIdsRef = useRef<NodeById>({})
  const filteredGraphData = useMemo(() => {
    hiddenNodeIdsRef.current = {}
    const filteredNodes = graphData?.nodes
      ?.filter((nodeArg) => {
        const node = nodeArg as OrgRoamNode
        //dirs
        if (
          filter.dirsBlocklist.length &&
          filter.dirsBlocklist.some((dir) => node?.file?.includes(dir))
        ) {
          hiddenNodeIdsRef.current = { ...hiddenNodeIdsRef.current, [node.id]: node }
          return false
        }
        if (
          filter.dirsAllowlist.length > 0 &&
          !filter.dirsAllowlist.some((dir) => node?.file?.includes(dir))
        ) {
          hiddenNodeIdsRef.current = { ...hiddenNodeIdsRef.current, [node.id]: node }
          return false
        }

        if (
          filter.tagsBlacklist.length &&
          filter.tagsBlacklist.some((tag) => node?.tags?.indexOf(tag) > -1)
        ) {
          hiddenNodeIdsRef.current = { ...hiddenNodeIdsRef.current, [node.id]: node }
          return false
        }
        if (
          filter.tagsWhitelist.length > 0 &&
          !filter.tagsWhitelist.some((tag) => node?.tags?.indexOf(tag) > -1)
        ) {
          hiddenNodeIdsRef.current = { ...hiddenNodeIdsRef.current, [node.id]: node }
          return false
        }
        if (filter.filelessCites && node?.properties?.FILELESS) {
          hiddenNodeIdsRef.current = { ...hiddenNodeIdsRef.current, [node.id]: node }
          return false
        }
        if (filter?.bad && node?.properties?.bad) {
          hiddenNodeIdsRef.current = { ...hiddenNodeIdsRef.current, [node.id]: node }
          return false
        }

        if (filter.dailies && dailyDir && node.file?.includes(dailyDir)) {
          hiddenNodeIdsRef.current = { ...hiddenNodeIdsRef.current, [node.id]: node }
          return false
        }
        if (filter.noter && node.properties?.NOTER_PAGE) {
          hiddenNodeIdsRef.current = { ...hiddenNodeIdsRef.current, [node.id]: node }
          return false
        }
        return true
      })
      .filter((node) => {
        const links = linksByNodeId[node?.id as string] ?? []
        const unhiddenLinks = links.filter(
          (link) =>
            !hiddenNodeIdsRef.current[link.source] && !hiddenNodeIdsRef.current[link.target],
        )

        if (!filter.orphans) {
          return true
        }

        if (filter.parent) {
          return unhiddenLinks.length !== 0
        }

        if (unhiddenLinks.length === 0) {
          return false
        }

        return unhiddenLinks.some((link) => !['parent', 'heading'].includes(link.type))
      })

    const filteredNodeIds = filteredNodes.map((node) => node.id as string)
    const filteredLinks = graphData.links.filter((link) => {
      const [sourceId, targetId] = normalizeLinkEnds(link)
      if (
        !filteredNodeIds.includes(sourceId as string) ||
        !filteredNodeIds.includes(targetId as string)
      ) {
        return false
      }
      const linkRoam = link as OrgRoamLink
      if (!filter.parent) {
        return !['parent', 'heading'].includes(linkRoam.type)
      }
      if (filter.parent === 'heading') {
        return linkRoam.type !== 'parent'
      }
      return linkRoam.type !== 'heading'
    })

    filteredLinksByNodeIdRef.current = filteredLinks.reduce<LinksByNodeId>((acc, linkArg) => {
      const link = linkArg as OrgRoamLink
      const [sourceId, targetId] = normalizeLinkEnds(link)
      return {
        ...acc,
        [sourceId]: [...(acc[sourceId] ?? []), link],
        [targetId]: [...(acc[targetId] ?? []), link],
      }
    }, {})

    const weightedLinks = filteredLinks.map((l) => {
      const [target, source] = normalizeLinkEnds(l)
      const link = l as OrgRoamLink
      return { target, source, weight: link.type === 'cite' ? 1 : 2 }
    })

    if (coloring.method === 'community') {
      const community = jLouvain().nodes(filteredNodeIds).edges(weightedLinks)
      clusterRef.current = community()
    }
    /* clusterRef.current = Object.fromEntries(
     *   Object.entries(community()).sort(([, a], [, b]) => a - b),
     * ) */
    //console.log(clusterRef.current)
    return { nodes: filteredNodes, links: filteredLinks }
  }, [filter, graphData, coloring.method])

  const [scopedGraphData, setScopedGraphData] = useState<GraphData>({ nodes: [], links: [] })

  useEffect(() => {
    if (!scope.nodeIds.length) {
      return
    }
    const oldScopedNodes =
      scope.nodeIds.length > 1
        ? scopedGraphData.nodes.filter((n) => !scope.excludedNodeIds.includes(n.id as string))
        : []
    const oldScopedNodeIds = oldScopedNodes.map((node) => node.id as string)
    const neighbs = findNthNeighbors({
      ids: scope.nodeIds,
      excludedIds: scope.excludedNodeIds,
      n: local.neighbors,
      linksByNodeId: filteredLinksByNodeIdRef.current,
    })
    const newScopedNodes = filteredGraphData.nodes
      .filter((node) => {
        if (oldScopedNodes.length) {
          if (oldScopedNodeIds.includes(node.id as string)) {
            return false
          }
          const links = filteredLinksByNodeIdRef.current[node.id as string] ?? []
          return links.some((link) => {
            const [source, target] = normalizeLinkEnds(link)
            return (
              !scope.excludedNodeIds.includes(source) &&
              !scope.excludedNodeIds.includes(target) &&
              (scope.nodeIds.includes(source) || scope.nodeIds.includes(target))
            )
          })
        }
        return neighbs.includes(node.id as string)
        // this creates new nodes, to separate them from the nodes in the global graph
        // and positions them in the center, so that the camera is not so jumpy
      })
      .map((node) => {
        return { ...node, x: 0, y: 0, vy: 0, vx: 0 }
      })
    const scopedNodes = [...oldScopedNodes, ...newScopedNodes]
    const scopedNodeIds = scopedNodes.map((node) => node.id as string)

    const oldRawScopedLinks = scope.nodeIds.length > 1 ? scopedGraphData.links : []
    const oldScopedLinks = oldRawScopedLinks.filter((l) => {
      !scope.excludedNodeIds.some((e) => normalizeLinkEnds(l).includes(e))
    })
    const newScopedLinks = filteredGraphData.links
      .filter((link) => {
        // we need to cover both because force-graph modifies the original data
        // but if we supply the original data on each render, the graph will re-render sporadically
        const [sourceId, targetId] = normalizeLinkEnds(link)
        if (
          oldScopedLinks.length &&
          oldScopedNodeIds.includes(targetId) &&
          oldScopedNodeIds.includes(sourceId)
        ) {
          return false
        }
        return (
          scopedNodeIds.includes(sourceId as string) && scopedNodeIds.includes(targetId as string)
        )
      })
      .map((link) => {
        const [sourceId, targetId] = normalizeLinkEnds(link)
        return { source: sourceId, target: targetId }
      })

    const scopedLinks = [...oldScopedLinks, ...newScopedLinks]

    setScopedGraphData({ nodes: scopedNodes, links: scopedLinks })
  }, [
    local.neighbors,
    filter,
    scope,
    scope.excludedNodeIds,
    scope.nodeIds,
    graphData,
    filteredGraphData.links,
    filteredGraphData.nodes,
  ])

  useEffect(() => {
    ;(async () => {
      const fg = graphRef.current
      if (!fg) return
      const d3 = await d3promise
      if (physics.gravityOn && !(scope.nodeIds.length && !physics.gravityLocal)) {
        fg.d3Force('x', d3.forceX().strength(physics.gravity))
        fg.d3Force('y', d3.forceY().strength(physics.gravity))
        threeDim && fg.d3Force('z', d3.forceZ().strength(physics.gravity))
      } else {
        fg.d3Force('x', null)
        fg.d3Force('y', null)
        threeDim && fg.d3Force('z', null)
      }
      physics.centering
        ? fg.d3Force('center', d3.forceCenter().strength(physics.centeringStrength))
        : fg.d3Force('center', null)
      physics.linkStrength && fg.d3Force('link').strength(physics.linkStrength)
      physics.linkIts && fg.d3Force('link').iterations(physics.linkIts)
      physics.charge && fg.d3Force('charge').strength(physics.charge)
      fg.d3Force(
        'collide',
        physics.collision ? d3.forceCollide().radius(physics.collisionStrength) : null,
      )
    })()
  }, [physics, threeDim, scope])

  // Normally the graph doesn't update when you just change the physics parameters
  // This forces the graph to make a small update when you do
  useEffect(() => {
    graphRef.current?.d3ReheatSimulation()
  }, [physics, scope.nodeIds.length])

  // shitty handler to check for doubleClicks
  const lastNodeClickRef = useRef(0)

  // this is for animations, it's a bit hacky and can definitely be optimized
  const [opacity, setOpacity] = useState(1)
  const [fadeIn, cancel] = useAnimation((x) => setOpacity(x), {
    duration: visuals.animationSpeed,
    algorithm: algos[visuals.algorithmName],
  })
  const [fadeOut, fadeOutCancel] = useAnimation(
    (x) => setOpacity(Math.min(opacity, -1 * (x - 1))),
    {
      duration: visuals.animationSpeed,
      algorithm: algos[visuals.algorithmName],
    },
  )

  const highlightedNodes = useMemo(() => {
    if (!centralHighlightedNode.current) {
      return {}
    }

    const links = filteredLinksByNodeIdRef.current[centralHighlightedNode.current.id!]
    if (!links) {
      return {}
    }
    return Object.fromEntries(
      [
        centralHighlightedNode.current?.id! as string,
        ...links.flatMap((link) => [link.source, link.target]),
      ].map((nodeId) => [nodeId, {}]),
    )
  }, [centralHighlightedNode.current, filteredLinksByNodeIdRef.current])

  useEffect(() => {
    if (sidebarHighlightedNode?.id) {
      setHoverNode(sidebarHighlightedNode)
    } else {
      setHoverNode(null)
    }
  }, [sidebarHighlightedNode])

  const lastHoverNode = useRef<OrgRoamNode | null>(null)

  useEffect(() => {
    centralHighlightedNode.current = hoverNode
    if (hoverNode) {
      lastHoverNode.current = hoverNode as OrgRoamNode
    }
    if (!visuals.highlightAnim) {
      return hoverNode ? setOpacity(1) : setOpacity(0)
    }
    if (hoverNode) {
      fadeIn()
    } else {
      // to prevent fadeout animation from starting at 1
      // when quickly moving away from a hovered node
      cancel()
      opacity > 0.5 ? fadeOut() : setOpacity(0)
    }
  }, [hoverNode])

  const highlightColors = useMemo(() => {
    return Object.fromEntries(
      colorList.map((color) => {
        const color1 = getThemeColor(color, theme)
        const crisscross = colorList.map((color2) => [
          color2,
          d3int.interpolate(color1, getThemeColor(color2, theme)),
        ])
        return [color, Object.fromEntries(crisscross)]
      }),
    )
  }, [emacsTheme])

  const previouslyHighlightedNodes = useMemo(() => {
    const previouslyHighlightedLinks =
      filteredLinksByNodeIdRef.current[lastHoverNode.current?.id!] ?? []
    return Object.fromEntries(
      [
        lastHoverNode.current?.id! as string,
        ...previouslyHighlightedLinks.flatMap((link) => normalizeLinkEnds(link)),
      ].map((nodeId) => [nodeId, {}]),
    )
  }, [JSON.stringify(hoverNode), lastHoverNode.current, filteredLinksByNodeIdRef.current])

  const labelTextColor = useMemo(
    () => getThemeColor(visuals.labelTextColor, theme),
    [visuals.labelTextColor, emacsTheme],
  )

  const labelBackgroundColor = useMemo(
    () => getThemeColor(visuals.labelBackgroundColor, theme),
    [visuals.labelBackgroundColor, emacsTheme],
  )

  const [dragging, setDragging] = useState(false)

  const scaleRef = useRef(1)
  const graphCommonProps: ComponentPropsWithoutRef<typeof TForceGraph2D> = {
    graphData: scope.nodeIds.length ? scopedGraphData : filteredGraphData,
    width: windowWidth,
    height: windowHeight,
    backgroundColor: visuals.backgroundColor === 'transparent' ? 'rgba(0,0,0,0)' : getThemeColor(visuals.backgroundColor, theme),
    warmupTicks: scope.nodeIds.length === 1 ? 100 : scope.nodeIds.length > 1 ? 20 : 0,
    onZoom: ({ k, x, y }) => (scaleRef.current = k),
    nodeColor: (node) => {
      return getNodeColor({
        node: node as OrgRoamNode,
        theme,
        visuals,
        cluster: clusterRef.current,
        coloring,
        emacsNodeId,
        highlightColors,
        highlightedNodes,
        previouslyHighlightedNodes,
        linksByNodeId: filteredLinksByNodeIdRef.current,
        opacity,
        tagColors,
      })
    },
    nodeRelSize: visuals.nodeRel,
    nodeVal: (node) => {
      return (
        nodeSize({
          node,
          highlightedNodes,
          linksByNodeId: filteredLinksByNodeIdRef.current,
          opacity,
          previouslyHighlightedNodes,
          visuals,
        }) / Math.pow(scaleRef.current, visuals.nodeZoomSize)
      )
    },
    nodeCanvasObject: (node, ctx, globalScale) => {
      drawLabels({
        nodeRel: visuals.nodeRel,
        filteredLinksByNodeId: filteredLinksByNodeIdRef.current,
        lastHoverNode: lastHoverNode.current,
        ...{
          node,
          ctx,
          globalScale,
          highlightedNodes,
          previouslyHighlightedNodes,
          visuals,
          opacity,
          labelTextColor,
          labelBackgroundColor,
          hoverNode,
        },
      })
    },
    nodeCanvasObjectMode: () => 'after',

    linkDirectionalParticles: visuals.particles ? visuals.particlesNumber : undefined,
    linkDirectionalArrowLength: visuals.arrows ? visuals.arrowsLength : undefined,
    linkDirectionalArrowRelPos: visuals.arrowsPos,
    linkDirectionalArrowColor: visuals.arrowsColor
      ? () => getThemeColor(visuals.arrowsColor, theme)
      : undefined,
    linkColor: (link) => {
      const sourceId = typeof link.source === 'object' ? link.source.id! : (link.source as string)
      const targetId = typeof link.target === 'object' ? link.target.id! : (link.target as string)
      const linkIsHighlighted = isLinkRelatedToNode(link, centralHighlightedNode.current)
      const linkWasHighlighted = isLinkRelatedToNode(link, lastHoverNode.current)
      const needsHighlighting = linkIsHighlighted || linkWasHighlighted
      const roamLink = link as OrgRoamLink

      if (visuals.refLinkColor && roamLink.type === 'ref') {
        return needsHighlighting && (visuals.refLinkHighlightColor || visuals.linkHighlight)
          ? interpolateColors(highlightColors, visuals.refLinkColor,
              visuals.refLinkHighlightColor || visuals.linkHighlight,
              opacity) ?? getThemeColor(visuals.refLinkColor, theme)
          : interpolateColors(highlightColors, visuals.refLinkColor, visuals.backgroundColor,
              visuals.highlightFade * opacity,
            ) ?? getThemeColor(visuals.refLinkColor, theme)
      }
      if (visuals.citeLinkColor && roamLink.type?.includes('cite')) {
        return needsHighlighting && (visuals.citeLinkHighlightColor || visuals.linkHighlight)
          ? interpolateColors(highlightColors, visuals.citeLinkColor,
              visuals.citeLinkHighlightColor || visuals.linkHighlight,
              opacity) ?? getThemeColor(visuals.citeLinkColor, theme)
          : interpolateColors(highlightColors, visuals.citeLinkColor, visuals.backgroundColor,
              visuals.highlightFade * opacity,
            ) ?? getThemeColor(visuals.citeLinkColor, theme)
      }

      return getLinkColor({
        sourceId: sourceId as string,
        targetId: targetId as string,
        needsHighlighting,
        theme,
        cluster: clusterRef.current,
        coloring,
        highlightColors,
        linksByNodeId: filteredLinksByNodeIdRef.current,
        opacity,
        visuals,
      })
    },
    linkWidth: (link) => {
      if (visuals.highlightLinkSize === 1) {
        return visuals.linkWidth
      }
      const linkIsHighlighted = isLinkRelatedToNode(link, centralHighlightedNode.current)
      const linkWasHighlighted = isLinkRelatedToNode(link, lastHoverNode.current)

      return linkIsHighlighted || linkWasHighlighted
        ? visuals.linkWidth * (1 + opacity * (visuals.highlightLinkSize - 1))
        : visuals.linkWidth
    },
    linkDirectionalParticleWidth: visuals.particlesWidth,

    d3AlphaDecay: physics.alphaDecay,
    d3AlphaMin: physics.alphaMin,
    d3VelocityDecay: physics.velocityDecay,

    onNodeClick: (nodeArg: NodeObject, event: any) => {
      const node = nodeArg as OrgRoamNode
      //contextMenu.onClose()
      const doubleClickTimeBuffer = 200
      const isDoubleClick = event.timeStamp - lastNodeClickRef.current < doubleClickTimeBuffer
      lastNodeClickRef.current = event.timeStamp
      if (isDoubleClick) {
        return handleClick('double', node, event)
      }

      const prevNodeClickTime = lastNodeClickRef.current
      return setTimeout(() => {
        if (lastNodeClickRef.current !== prevNodeClickTime) {
          return
        }
        return handleClick('click', node, event)
      }, doubleClickTimeBuffer)
    },
    /* onBackgroundClick: () => {
     *   contextMenu.onClose()
     *   setHoverNode(null)
     *   if (scope.nodeIds.length === 0) {
     *     return
     *   }
     *   if (mouse.backgroundExitsLocal) {
     *     setScope((currentScope: Scope) => ({
     *       ...currentScope,
     *       nodeIds: [],
     *     }))
     *   }
     * }, */
    onNodeHover: (node) => {
      if (!visuals.highlight) {
        return
      }
      if (dragging) {
        return
      }

      if (!hoverNode) {
        fadeOutCancel()
        setOpacity(0)
      }
      setHoverNode(node)
    },
    onNodeRightClick: (nodeArg, event) => {
      const node = nodeArg as OrgRoamNode

      handleClick('right', node, event)
    },
    onNodeDrag: (node) => {
      //contextMenu.onClose()
      setHoverNode(node)
      setDragging(true)
    },
    onNodeDragEnd: () => {
      setHoverNode(null)
      setDragging(false)
    },
  }

  return (
    <Box overflow="hidden" onClick={contextMenu.onClose}>
      {threeDim ? (
        <ForceGraph3D
          ref={graphRef}
          {...graphCommonProps}
          {...({ showNavInfo: false } as any)}
          nodeThreeObjectExtend={true}
          nodeOpacity={visuals.nodeOpacity}
          nodeResolution={visuals.nodeResolution}
          linkOpacity={visuals.linkOpacity}
          nodeThreeObject={(node: OrgRoamNode) => {
            if (!visuals.labels) {
              return
            }
            if (visuals.labels < 3 && !highlightedNodes[node.id!]) {
              return
            }
            const sprite = new SpriteText(node.title.substring(0, 40))
            sprite.fontFace = "'VT323', 'Courier New', monospace"
            sprite.color = 'black'
            sprite.backgroundColor = 'rgba(0, 0, 0, 0)'
            sprite.padding = 0
            sprite.textHeight = 8
            ;(sprite as any).position.set(0, -14, 0)

            if ((sprite as any).material) {
              ;(sprite as any).material.depthWrite = false
            }

            return sprite
          }}
        />
      ) : (
        <ForceGraph2D
          ref={graphRef}
          {...graphCommonProps}
          {...({ showNavInfo: false } as any)}
          linkLineDash={(link) => {
            const linkArg = link as OrgRoamLink
            if (visuals.citeDashes && linkArg.type?.includes('cite')) {
              return [visuals.citeDashLength, visuals.citeGapLength]
            }
            if (visuals.refDashes && linkArg.type == 'ref') {
              return [visuals.refDashLength, visuals.refGapLength]
            }
            return null
          }}
        />
      )}
    </Box>
  )
}
