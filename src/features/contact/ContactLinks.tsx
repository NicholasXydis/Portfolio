import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { CheckIcon, GithubIcon, LinkedinIcon, MailIcon } from "@/components";
import { useMagnetic } from "@/hooks/useMagnetic";
import { spring, transition } from "@/lib/motion";
import { CONTACT } from "@/lib/site";
import { track } from "@/lib/analytics";

type ContactChannel = "email" | "github" | "linkedin";

interface ContactItem {
  key: ContactChannel;
  href: string;
  label: string;
  external: boolean;
  icon: ReactNode;
  copyValue?: string;
}

const iconClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-white/70 transition-colors hover:border-white/20 hover:text-white";

interface ContactIconProps {
  item: ContactItem;
  icon: ReactNode;
  onActivate: () => void;
}

function ContactIcon({ item, icon, onActivate }: ContactIconProps) {
  const magnetic = useMagnetic<HTMLAnchorElement>();

  const shared = {
    ref: magnetic.ref,
    "aria-label": item.label,
    className: iconClass,
    style: magnetic.style,
    onMouseMove: magnetic.onMouseMove,
    onMouseLeave: magnetic.onMouseLeave,
    whileHover: { scale: 1.12, transition: spring.magnetic },
    whileTap: { scale: 0.9 },
    onClick: onActivate,
  };

  if (item.external) {
    return (
      <motion.a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        {...shared}
      >
        {icon}
      </motion.a>
    );
  }

  return (
    <motion.a href={item.href} {...shared}>
      {icon}
    </motion.a>
  );
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

  return (
    <ul className="flex items-center gap-2.5">
      {items.map((item) => {
        const isCopied = copiedKey === item.key;
        const icon =
          item.copyValue && isCopied ? <CheckIcon size={20} /> : item.icon;

        return (
          <li key={item.key} className="relative">
            <ContactIcon
              item={item}
              icon={icon}
              onActivate={() => {
                track.contact(item.key);
                if (item.copyValue) copy(item.key, item.copyValue);
              }}
            />
            <AnimatePresence>
              {item.copyValue && isCopied && (
                <motion.span
                  role="status"
                  initial={{ opacity: 0, x: "-50%", y: 4, scale: 0.9 }}
                  animate={{ opacity: 1, x: "-50%", y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: "-50%", y: 4, scale: 0.9 }}
                  transition={transition.fast}
                  className="pointer-events-none absolute -top-9 left-1/2 whitespace-nowrap rounded-md bg-white px-2 py-1 font-mono text-xs font-medium text-black shadow-lg"
                >
                  {t("contact.copied")}
                </motion.span>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
