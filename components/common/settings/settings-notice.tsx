import { SettingsCard, SettingsRow, SettingsSection, SettingsShell } from './shared';

export default function SettingsNotice({
   title,
   description,
   milestone,
}: {
   title: string;
   description: string;
   milestone: string;
}) {
   return (
      <SettingsShell title={title} description={description}>
         <SettingsSection>
            <SettingsCard>
               <SettingsRow
                  title="Not available yet"
                  description={`This control surface is intentionally disabled until ${milestone} is implemented. No settings shown here are being simulated or saved locally.`}
                  trailing={
                     <span className="rounded-md border bg-muted/30 px-2 py-1 text-xs font-medium text-muted-foreground">
                        Planned
                     </span>
                  }
               />
            </SettingsCard>
         </SettingsSection>
      </SettingsShell>
   );
}
