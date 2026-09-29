'use client';

/**
 * @bighat/ui ships without "use client" directives, so its components cannot
 * be rendered from a Server Component directly. Re-exporting them from here
 * puts them behind a client boundary. Import design system components from
 * this module, never from '@bighat/ui'.
 */
export {
  AppBar,
  AppShell,
  Article,
  ArticleMargin,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Checkbox,
  DescriptionList,
  FileDropzone,
  FilterChip,
  Input,
  NavGroup,
  NavItem,
  NavList,
  Progress,
  RadioGroup,
  SegmentedControl,
  SkipLink,
  StateBlock,
  Table,
  Textarea,
  ToastProvider,
  useToast,
} from '@bighat/ui';
