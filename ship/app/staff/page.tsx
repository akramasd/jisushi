import { redirect } from "next/navigation"

export default function StaffPage() {
  redirect(
    "https://bczgdophgxjltnpzmkic.supabase.co/functions/v1/staff-portal",
  )
}
