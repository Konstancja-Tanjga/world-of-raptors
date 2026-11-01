'use client';

/**
 * @bighat/ui ships without "use client" directives, so its components cannot
 * be rendered from a Server Component directly. Re-exporting them from here
 * puts them behind a client boundary. Import design system components from
 * this module, never from '@bighat/ui'.
 */
export {
  Accordion,
  AccordionItem,
  AppBar,
  AppShell,
  Article,
  ArticleMargin,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Checkbox,
  DatePicker,
  DescriptionList,
  Dialog,
  FileDropzone,
  FilterChip,
  Input,
  NavGroup,
  NavItem,
  NavList,
  Progress,
  RadioGroup,
  SegmentedControl,
  Select,
  SkipLink,
  Slider,
  StateBlock,
  Table,
  Textarea,
  ToastProvider,
  useToast,
} from '@bighat/ui';
