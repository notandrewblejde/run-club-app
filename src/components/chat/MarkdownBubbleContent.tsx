import Markdown from 'react-native-markdown-display';
import { Linking } from 'react-native';
import type { ThemeTokens } from '@/theme/tokens';

type Variant = 'user' | 'assistant';

interface MarkdownBubbleContentProps {
  content: string;
  variant: Variant;
  tokens: ThemeTokens;
  /** Body text size (line height scales with it). */
  fontSize?: number;
}

/** Renders coach / AI bubble copy with light Markdown (**bold**, lists, links). */
export function MarkdownBubbleContent({
  content,
  variant,
  tokens,
  fontSize = 15,
}: MarkdownBubbleContentProps) {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const fg = variant === 'user' ? '#ffffff' : tokens.text;
  const fgSecondary = variant === 'user' ? 'rgba(255,255,255,0.88)' : tokens.textSecondary;
  const linkColor = variant === 'user' ? '#B8E5FF' : tokens.accentBlue;
  const codeBg = variant === 'user' ? 'rgba(0,0,0,0.28)' : tokens.surfaceElevated;
  const lineHeight = Math.round(fontSize * 1.4);

  return (
    <Markdown
      onLinkPress={(url) => {
        Linking.openURL(url).catch(() => undefined);
        return true;
      }}
      style={{
        body: { color: fg, fontSize, lineHeight },
        text: { color: fg },
        paragraph: { marginTop: 0, marginBottom: 8, color: fg },
        strong: { fontWeight: '700', color: fg },
        em: { fontStyle: 'italic', color: fgSecondary },
        bullet_list: { marginBottom: 4 },
        ordered_list: { marginBottom: 4 },
        list_item: { color: fg, marginBottom: 4, fontSize, lineHeight },
        heading1: { color: fg, fontSize: fontSize + 4, fontWeight: '700', marginBottom: 6 },
        heading2: { color: fg, fontSize: fontSize + 2, fontWeight: '700', marginBottom: 4 },
        heading3: { color: fg, fontSize: fontSize + 1, fontWeight: '700', marginBottom: 4 },
        link: { color: linkColor, textDecorationLine: 'underline' },
        blockquote: {
          borderLeftColor: fgSecondary,
          borderLeftWidth: 3,
          paddingLeft: 8,
          color: fgSecondary,
        },
        code_inline: {
          backgroundColor: codeBg,
          color: fg,
          paddingHorizontal: 4,
          borderRadius: 4,
          fontSize: fontSize - 1,
        },
        fence: {
          backgroundColor: codeBg,
          color: fg,
          padding: 8,
          borderRadius: 8,
          fontSize: fontSize - 1,
        },
        hr: { backgroundColor: tokens.divider, height: 1, marginVertical: 8 },
      }}
    >
      {trimmed}
    </Markdown>
  );
}
