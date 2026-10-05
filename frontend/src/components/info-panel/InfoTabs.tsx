import { useState } from "react";
import type { MessageRead } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { INFO_TABS } from "../../registries/infoTabs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InfoTabsProps {
  messages: MessageRead[];
}

export function InfoTabs({ messages }: InfoTabsProps) {
  const { t } = useLocale();
  const [activeId, setActiveId] = useState(INFO_TABS[0].id);

  return (
    <Tabs value={activeId} onValueChange={setActiveId} className="border-t pt-3">
      <div className="px-3 pb-2">
        <TabsList className="w-full">
          {INFO_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {t(tab.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {INFO_TABS.map(({ id, component: Panel }) => (
        <TabsContent key={id} value={id} className="pb-3 animate-in fade-in-0 duration-200">
          <Panel messages={messages} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
