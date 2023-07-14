import yaml


def read_yaml(filename):
    with open(filename) as file_obj:
        return yaml.load(file_obj, Loader=yaml.FullLoader)


# unused; delete?
def setup_menu(menu, pages):
    result = {}
    if isinstance(menu, dict):
        for item, sub_menu in menu.items():
            result[item] = setup_menu(sub_menu, pages)
    elif isinstance(menu, (list, tuple)):
        for item in menu:
            if isinstance(item, str):
                result[item] = setup_menu(item, pages)
            else:
                for name, sub_menu in setup_menu(item, pages).items():
                    result[name] = sub_menu
    else:
        # base case
        return pages.get(menu, pages["404"])

    # recursive case
    return result
