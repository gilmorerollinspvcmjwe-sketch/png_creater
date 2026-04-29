import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'

interface Props {
  children: ReactNode
  componentId: string
  componentType: string
  onDelete?: (id: string) => void
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * 🟡 6: ErrorBoundary for DraggableComponent
 * 组件渲染失败时显示占位符，不影响编辑器其他部分
 */
class ComponentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ComponentErrorBoundary] 组件 ${this.props.componentType} (${this.props.componentId}) 渲染失败:`, error)
    console.error('ErrorInfo:', errorInfo.componentStack)
  }

  handleDelete = () => {
    if (this.props.onDelete) {
      this.props.onDelete(this.props.componentId)
    }
  }

  render() {
    if (this.state.hasError) {
      // 默认占位符
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div 
          className="w-full h-full flex flex-col items-center justify-center bg-red-50 border border-red-200 rounded-lg p-2"
          style={{ minHeight: 50 }}
        >
          <AlertTriangle size={16} className="text-red-500 mb-1" />
          <span className="text-xs text-red-600 text-center">
            组件渲染失败
          </span>
          <span className="text-xs text-red-400">
            {this.props.componentType}
          </span>
          {this.props.onDelete && (
            <button
              onClick={this.handleDelete}
              className="mt-2 p-1 bg-red-100 hover:bg-red-200 rounded text-red-600 flex items-center gap-1"
              title="删除此组件"
            >
              <Trash2 size={12} />
              <span className="text-xs">删除</span>
            </button>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export default ComponentErrorBoundary