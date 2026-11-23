/** Message d'erreur JSON d'une route API, ou le libellé de repli. */
export async function messageErreur(res: Response, defaut: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return typeof data.error === "string" ? data.error : defaut;
}