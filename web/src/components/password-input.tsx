/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { Eye, EyeOff } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { Button } from './ui/button'
import { Input } from './ui/input'

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  ref?: React.Ref<HTMLInputElement>
}

export function PasswordInput({
  className,
  disabled,
  ref,
  ...props
}: PasswordInputProps) {
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = React.useState(false)
  const visibilityLabel = showPassword ? t('Hide password') : t('Show password')

  return (
    <div className={cn('relative rounded-md', className)}>
      <Input
        type={showPassword ? 'text' : 'password'}
        data-password-input=''
        ref={ref}
        disabled={disabled}
        {...props}
      />
      {/*
       * Centring the button with `-translate-y-1/2` collides with the shared
       * button style's `:active` translate (both write --tw-translate-y): on
       * mousedown the button jumped ~17px down, mouseup landed on the input
       * and the browser dispatched `click` on their common parent — so the
       * toggle silently did nothing. Let a wrapper own the positioning and
       * keep all transforms off the button itself.
       */}
      <div className='pointer-events-none absolute inset-y-0 end-0.5 z-10 flex items-center'>
        <Button
          type='button'
          size='icon'
          variant='ghost'
          disabled={disabled}
          data-password-visible={showPassword}
          aria-pressed={showPassword}
          title={visibilityLabel}
          className={cn(
            'pointer-events-auto h-8 w-8 rounded-md transition-colors',
            showPassword
              ? 'bg-foreground/10 text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={visibilityLabel}
        >
          {showPassword ? (
            <Eye size={18} aria-hidden='true' />
          ) : (
            <EyeOff size={18} aria-hidden='true' />
          )}
        </Button>
      </div>
    </div>
  )
}
