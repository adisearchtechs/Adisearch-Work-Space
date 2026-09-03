'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { SettingsCard, SettingsRow, SettingsSection, SettingsShell } from './shared';

export default function Profile() {
   const { user, organization } = useWorkspace();
   const displayName = user.displayName || 'Workspace member';
   const username = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 32);
   const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);
   const fallback = displayName.slice(0, 2).toUpperCase();

   return (
      <SettingsShell
         title="My Profile"
         description="This page reflects authenticated workspace identity. Editing profile fields is not available until persistent profile settings are implemented."
      >
         <SettingsSection>
            <SettingsCard>
               <SettingsRow
                  title="Profile picture"
                  description={`Your identity in ${organization.name}`}
                  trailing={
                     <Avatar className="size-10 border">
                        <AvatarImage src={user.avatarUrl ?? undefined} alt={displayName} />
                        <AvatarFallback>{fallback}</AvatarFallback>
                     </Avatar>
                  }
               />
               <SettingsRow
                  title="Display name"
                  description="Shown on projects, updates, and workspace activity"
                  trailing={
                     <Input
                        value={displayName}
                        readOnly
                        aria-label="Display name"
                        className="h-8 w-44 bg-muted/40"
                     />
                  }
               />
               <SettingsRow
                  title="Username"
                  description="Derived from your current display name; it is not a separately persisted username."
                  trailing={
                     <Input
                        value={username || 'member'}
                        readOnly
                        aria-label="Username"
                        className="h-8 w-44 bg-muted/40"
                     />
                  }
               />
               <SettingsRow
                  title="Email"
                  trailing={<span className="text-sm text-foreground">{user.email}</span>}
               />
               <SettingsRow
                  title="Workspace role"
                  trailing={
                     <span className="rounded-md border bg-muted/30 px-2 py-1 text-xs font-medium">
                        {roleLabel}
                     </span>
                  }
               />
            </SettingsCard>
         </SettingsSection>

         <SettingsSection title="Workspace access">
            <SettingsCard>
               <SettingsRow
                  title={organization.name}
                  description={`Signed in as ${displayName}`}
                  trailing={
                     <span className="text-xs text-muted-foreground">
                        Membership changes are managed by workspace administrators
                     </span>
                  }
               />
            </SettingsCard>
         </SettingsSection>
      </SettingsShell>
   );
}
