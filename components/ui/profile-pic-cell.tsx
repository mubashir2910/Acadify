"use client"

import type { ICellRendererParams } from "ag-grid-community"

interface RowWithUser {
  user: {
    name: string
    profile_picture: string | null
  }
}

export function ProfilePicCell<T extends RowWithUser>(params: ICellRendererParams<T>) {
  const pic = params.data?.user?.profile_picture
  const name = params.data?.user?.name ?? "?"

  if (pic) {
    return (
      <div className="flex items-center justify-center h-full">
        <img
          src={pic}
          alt={name}
          className="h-8 w-8 rounded-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-medium">
        {name.charAt(0).toUpperCase()}
      </div>
    </div>
  )
}
