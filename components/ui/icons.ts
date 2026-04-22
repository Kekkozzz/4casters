/**
 * Central icon re-exports.
 *
 * Pages and primitives import icons from here so swapping the underlying
 * library (or renaming) happens in one place. Names match the prototype's
 * `I.*` ergonomics in prototype/src/icons.jsx.
 */
export {
  Calendar,
  List,
  Bookmark,
  Settings,
  Search,
  Plus,
  Mail,
  Check,
  ChevronRight as ChevRight,
  ChevronDown as ChevDown,
  ChevronUp as ChevUp,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ExternalLink as External,
  Download,
  Share2 as Share,
  RefreshCw as Refresh,
  Flag,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle as AlertTri,
  Globe,
  Play as Youtube,
  AtSign as Twitter,
  ArrowUpDown as Sort,
} from "lucide-react";
// Note: lucide-react 1.x dropped brand icons (Youtube/Twitter).
// Aliasing Play → Youtube and AtSign → Twitter keeps source-type
// semantics at call sites without blocking on brand-accurate glyphs.
// Swap in brand SVGs inline when needed for parity with the prototype.
