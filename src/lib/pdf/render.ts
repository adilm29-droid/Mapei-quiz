import { renderToBuffer } from '@react-pdf/renderer'
import * as React from 'react'
import { UserReport, type UserReportProps } from './UserReport'
import { AdminReport, type AdminReportProps } from './AdminReport'

/** Renders the user PDF and returns the raw PDF bytes as a Buffer. */
export async function renderUserReport(props: UserReportProps): Promise<Buffer> {
  return await renderToBuffer(React.createElement(UserReport, props) as any)
}

/** Renders the admin PDF and returns the raw PDF bytes as a Buffer. */
export async function renderAdminReport(props: AdminReportProps): Promise<Buffer> {
  return await renderToBuffer(React.createElement(AdminReport, props) as any)
}
