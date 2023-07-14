import utils
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from starlette.templating import Jinja2Templates


app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates", extensions=['jinja2.ext.do'])
MENU = utils.read_yaml('static/menu.yml')
PAGES = utils.read_yaml('static/pages.yml')
#MENU_PAGES = utils.setup_menu(MENU, PAGES)

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return await page(request, "home")


@app.get("/{page}", response_class=HTMLResponse)
async def page(request: Request, page: str):
    if page not in PAGES:
        page = "404"

    return templates.TemplateResponse("layouts/single_page.html", {
        "request": request, "content": page, "menu": MENU,
        "page": PAGES[page],
    })
