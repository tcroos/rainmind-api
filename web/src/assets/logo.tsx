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
import { type SVGProps } from 'react'

import { cn } from '@/lib/utils'

export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      id='rainmind-logo'
      viewBox='0 0 24 24'
      xmlns='http://www.w3.org/2000/svg'
      height='24'
      width='24'
      fill='none'
      className={cn('size-6', className)}
      {...props}
    >
      <title>RainMind</title>
      <defs>
        <linearGradient
          id='rainmind-grad'
          x1='2'
          y1='2'
          x2='22'
          y2='22'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0' stopColor='#2DD4BF' />
          <stop offset='0.5' stopColor='#8B5CF6' />
          <stop offset='1' stopColor='#EC4899' />
        </linearGradient>
      </defs>
      <path
        d='M12 1.8c.7 4.2 2.2 6.6 5.4 7.6-3.2 1-4.7 3.4-5.4 7.6-.7-4.2-2.2-6.6-5.4-7.6 3.2-1 4.7-3.4 5.4-7.6Z'
        fill='url(#rainmind-grad)'
      />
      <path
        d='M12 17.2c.35 2 1.05 3.15 2.6 3.6-1.55.45-2.25 1.6-2.6 3.6-.35-2-1.05-3.15-2.6-3.6 1.55-.45 2.25-1.6 2.6-3.6Z'
        fill='url(#rainmind-grad)'
        opacity='0.85'
      />
    </svg>
  )
}
