import { Button } from './ui/button'
import { useViewMode, type ViewMode } from '../lib/viewMode'

export function ViewModeSwitch() {
  const { mode, setMode } = useViewMode()

  const choose = (next: ViewMode) => {
    if (next !== mode) {
      setMode(next).catch((error) => {
        console.error('Error switching view:', error)
      })
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="sm"
        variant={mode === 'instructor' ? 'default' : 'outline'}
        onClick={() => choose('instructor')}
      >
        Instructor
      </Button>
      <Button
        type="button"
        size="sm"
        variant={mode === 'student' ? 'default' : 'outline'}
        onClick={() => choose('student')}
      >
        Student
      </Button>
    </div>
  )
}
