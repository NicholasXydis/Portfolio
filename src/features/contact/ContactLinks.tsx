import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckIcon,
  ExternalLink,
  GithubIcon,
  LinkedinIcon,
  MailIcon,
} from "@/components";
import { CONTACT } from "@/lib/site";

interface ContactItem {
  key: string;
  href: string;
  label: string;
  external: boolean;
  icon: ReactNode;
  copyValue?: string;
}

export function ContactLinks() {
  const { t } = useTranslation();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = (key: string, value: string) => {
    if (!navigator.clipboard) return;
    void navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopiedKey(key);
        window.setTimeout(
          () => setCopiedKey((current) => (current === key ? null : current)),
          1600,
        );
      })
      .catch(() => undefined);
  };

  const items: ContactItem[] = [
    {
      key: "email",
      href: `mailto:${CONTACT.email}`,
      label: t("contact.email"),
      external: false,
      icon: <MailIcon size={20} />,
      copyValue: CONTACT.email,
    },
    {
      key: "github",
      href: CONTACT.github,
      label: t("contact.github"),
      external: true,
      icon: <GithubIcon size={20} />,
    },
    {
      key: "linkedin",
      href: CONTACT.linkedin,
      label: t("contact.linkedin"),
      external: true,
      icon: <LinkedinIcon size={20} />,
    },
  ];

  const className =
    "inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-white/70 transition-colors hover:border-white/20 hover:text-white";

  return (
    <ul className="flex items-center gap-2.5">
      {items.map((item) => {
        const isCopied = copiedKey === item.key;
        const icon =
          item.copyValue && isCopied ? <CheckIcon size={20} /> : item.icon;

        return (
          <li key={item.key} className="relative">
            {item.external ? (
              <ExternalLink
                href={item.href}
                aria-label={item.label}
                className={className}
              >
                {icon}
              </ExternalLink>
            ) : (
              <a
                href={item.href}
                aria-label={item.label}
                className={className}
                onClick={
                  item.copyValue
                    ? () => copy(item.key, item.copyValue as string)
                    : undefined
                }
              >
                {icon}
              </a>
            )}
            {item.copyValue && isCopied && (
              <span
                role="status"
                className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-2 py-1 font-mono text-xs font-medium text-black shadow-lg"
              >
                {t("contact.copied")}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
