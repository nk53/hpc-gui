import yaml


def read_yaml(filename):
    with open(filename) as file_obj:
        return yaml.load(file_obj, Loader=yaml.FullLoader)
